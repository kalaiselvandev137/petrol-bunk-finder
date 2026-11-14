import mongoose from "mongoose";
import xlsx from "xlsx";
import { Dealer } from "../models/DealerModel.js";
import { Employee } from "../models/EmployeeModel.js"; // adjust path/name if your employee model file differs

// Employee records store First_Name / Last_Name separately (there is no
// single Name field) — this mirrors however req.user.Name gets composed
// at login, so Employee_Name stays consistent with what's in the JWT.
const fullName = (employee) =>
  [employee?.First_Name, employee?.Last_Name].filter(Boolean).join(' ').trim();

// ---------- existing: paginated / filtered dealer list ----------
export const getalldealers = async (req, res, next) => {
  try {
    const { first, rows, globalfilter, colfilter } = req.query;
    const fieldArray = Object.keys(Dealer.schema.obj);
    const globalFilter = globalfilter
      ? {
        $or: fieldArray
          .filter((field) => Dealer.schema.path(field) instanceof mongoose.Schema.Types.String)
          .map((field) => ({ [field]: { $regex: globalfilter, $options: 'i' } })),
      }
      : {};
    let filter = colfilter ? { ...globalFilter, ...colfilter } : globalFilter;

    // Sales_Man only ever sees their own dealers
    if (req.user.Role === 'Sales_Man') {
      filter = { ...filter, Employee_Name: req.user.Name };
    }

    const resdata = await Dealer.find(filter).skip(Number(first) || 0).limit(Number(rows) || 10);
    const totallength = await Dealer.countDocuments(filter);
    res.send({ resdata, totallength });
  } catch (err) {
    console.error(err);
    res.send('Internal Server Error');
  }
};

// ---------- add a single dealer (own, for Sales_Man; any employee, for Admin) ----------
export const savedealer = async (req, res) => {
  try {
    const body = { ...req.body };

    if (req.user.Role === 'Sales_Man') {
      // A salesman can only ever add a dealer for themselves
      body.Employee_ID = req.user.id;
      body.Employee_Name = req.user.Name;
    } else if (body.Employee_ID) {
      const employee = await Employee.findById(body.Employee_ID);
      if (employee) body.Employee_Name = fullName(employee);
    }

    const dealer = new Dealer(body);
    await dealer.save();
    res.send({ success: true, dealer });
  } catch (err) {
    console.error(err);
    res.send({ success: false, message: 'Internal Server Error' });
  }
};

// ---------- update a dealer ----------
// CHANGED:
//  - a Sales_Man can only update dealers allocated to him (before, any dealer _id could be edited,
//    and the dealer was then reassigned to the caller)
//  - a Sales_Man can only change the fields the app edits (not Approved_Line_Amount, Lead_ID, etc.)
//  - accepts latitude / longitude (captured by "Use current location" in the app)
const SALESMAN_EDITABLE = [
  'Primary_Mobile',
  'Status',
  'Current_Address_Line',
  'Current_Address_Locality',
  'Current_Address_State',
  'latitude',
  'longitude',
];

const isBlank = (v) => v === undefined || v === null || v === '';

export const updatedealer = async (req, res) => {
  try {
    const { _id, ...rest } = req.body;
    const filter = { _id };
    let update = {};

    if (req.user.Role === 'Sales_Man') {
      SALESMAN_EDITABLE.forEach((key) => {
        if (rest[key] !== undefined) update[key] = rest[key];
      });
      filter.Employee_ID = req.user.id; // own dealers only
    } else {
      update = { ...rest };
      if (rest.Employee_ID) {
        const employee = await Employee.findById(rest.Employee_ID);
        if (employee) update.Employee_Name = fullName(employee);
      }
    }

    // coordinates: both or neither, and within valid ranges
    const hasLat = !isBlank(update.latitude);
    const hasLng = !isBlank(update.longitude);
    if (hasLat || hasLng) {
      const lat = Number(update.latitude);
      const lng = Number(update.longitude);
      if (!hasLat || !hasLng || !Number.isFinite(lat) || !Number.isFinite(lng) ||
          Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return res.send({ success: false, message: 'Invalid coordinates' });
      }
      update.latitude = lat;
      update.longitude = lng;
      update.Location_Updated_At = new Date();
    } else {
      delete update.latitude;
      delete update.longitude;
    }

    const dealer = await Dealer.findOneAndUpdate(filter, update, { new: true });
    if (!dealer) {
      return res.send({ success: false, message: 'Dealer not found' });
    }
    res.send({ success: true, dealer });
  } catch (err) {
    console.error(err);
    res.send({ success: false, message: 'Internal Server Error' });
  }
};

// ---------- delete a dealer ----------
export const deletedealer = async (req, res) => {
  try {
    const { id } = req.params;

    // A salesman may only delete their own dealer records
    const filter = req.user.Role === 'Sales_Man' ? { _id: id, Employee_Name: req.user.Name } : { _id: id };
    await Dealer.findOneAndDelete(filter);
    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.send({ success: false, message: 'Internal Server Error' });
  }
};

// ---------- bulk upload dealers from Excel for a particular salesman ----------
export const bulkuploaddealers = async (req, res) => {
  try {
    if (!req.file) {
      return res.send({ success: false, message: 'No file uploaded' });
    }

    let targetEmployeeId = null;
    let targetEmployeeName = null;

    if (req.user.Role === 'Sales_Man') {
      // A salesman can only bulk upload dealers into their own book
      targetEmployeeId = req.user.id;
      targetEmployeeName = req.user.Name;
    } else {
      const { salesmanId } = req.body;
      if (!salesmanId) {
        return res.send({ success: false, message: 'salesmanId is required for bulk upload' });
      }
      const salesman = await Employee.findById(salesmanId);
      if (!salesman) {
        return res.send({ success: false, message: 'Salesman not found' });
      }
      targetEmployeeId = salesman._id;
      targetEmployeeName = fullName(salesman);
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const normalize = (str) => String(str || '').trim().toLowerCase();

    const getField = (row, ...keys) => {
      for (const rowKey of Object.keys(row)) {
        if (keys.some((k) => normalize(k) === normalize(rowKey))) return row[rowKey];
      }
      return '';
    };

    const dealersToInsert = [];
    const skipped = [];

    rows.forEach((row, index) => {
      const leadId = getField(row, 'Account ID', 'Lead_ID', 'AccountID');
      const businessName = getField(row, 'Business Name & Code', 'Business_Name', 'Business Name');
      const mobile = getField(row, 'Primary Mobile', 'Primary_Mobile', 'Mobile');

      if (!leadId || !businessName) {
        skipped.push({ row: index + 2, reason: 'Missing Account ID or Business Name' });
        return;
      }

      dealersToInsert.push({
        Lead_ID: String(leadId).trim(),
        Business_Name: String(businessName).trim(),
        OMC: getField(row, 'OMC'),
        Primary_Mobile: String(mobile).trim(),
        Current_Address_Locality: getField(row, 'City', 'Current_Address_Locality'),
        Current_Address_State: getField(row, 'State', 'Current_Address_State'),
        Approved_Line_Amount: String(getField(row, 'Loan Value', 'Approved_Line_Amount') || ''),
        Employee_ID: targetEmployeeId,
        Employee_Name: targetEmployeeName,
        Status: 'Active',
      });
    });

    if (dealersToInsert.length === 0) {
      return res.send({ success: false, message: 'No valid rows found in the file', skipped });
    }

    // Skip rows that already exist (by Lead_ID) so re-uploads don't duplicate
    const existingLeadIds = await Dealer.find({
      Lead_ID: { $in: dealersToInsert.map((d) => d.Lead_ID) },
    }).distinct('Lead_ID');

    const newDealers = dealersToInsert.filter((d) => !existingLeadIds.includes(d.Lead_ID));
    const duplicateCount = dealersToInsert.length - newDealers.length;

    const inserted = newDealers.length > 0 ? await Dealer.insertMany(newDealers) : [];

    res.send({
      success: true,
      message: `${inserted.length} dealer(s) uploaded for ${targetEmployeeName}`,
      insertedCount: inserted.length,
      duplicateCount,
      skippedCount: skipped.length,
      skipped,
    });
  } catch (err) {
    console.error(err);
    res.send({ success: false, message: 'Internal Server Error' });
  }
};

// ---------- salesman-wise dealer stats, for the salesman dashboard ----------
export const getdealerstatsforsalesman = async (req, res) => {
  try {
    const salesmanName = req.user?.Name;

    if (!salesmanName) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Admin can optionally pass ?salesman=Name to view a specific salesman's book;
    // a Sales_Man always sees only their own.
    const filter =
      req.user.Role === 'Sales_Man'
        ? { Employee_Name: salesmanName }
        : req.query.salesman
          ? { Employee_Name: req.query.salesman }
          : {};

    const dealers = await Dealer.find(filter).sort({ createdAt: -1 });

    const totalDealers = dealers.length;
    const activeDealers = dealers.filter((d) => d.Status === 'Active').length;
    const totalApprovedAmount = dealers.reduce(
      (sum, d) => sum + (Number(d.Approved_Line_Amount) || 0),
      0
    );

    return res.send({
      success: true,
      stats: { totalDealers, activeDealers, totalApprovedAmount },
      recentDealers: dealers,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ---------- salesman-wise dealer list (paginated, searchable), for the salesman dashboard ----------
export const getdealersbysalesman = async (req, res, next) => {
  try {
    const { first = 0, rows = 10, globalfilter = '' } = req.query;
    const userRole = req.user?.Role;
    const userId = req.user?.id;

    // Admin can optionally pass ?salesmanId=<employeeId> to view a specific
    // salesman's book; a Sales_Man always sees only their own (Employee_ID
    // is matched as an ObjectId, so it doesn't depend on name formatting).
    const targetEmployeeId =
      userRole === 'Admin' && req.query.salesmanId ? req.query.salesmanId : userId;

    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    const filter = { Employee_ID: targetEmployeeId };

    // Fetch this salesman's dealers
    const dealers = await Dealer.find(filter)
      .populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email')
      .sort({ createdAt: -1 })
      .lean();

    // Apply global search filter on dealer fields
    let filteredDealers = dealers;

    if (globalfilter) {
      const searchLower = globalfilter.toLowerCase();
      filteredDealers = dealers.filter(
        (dealer) =>
          (dealer.Business_Name && dealer.Business_Name.toLowerCase().includes(searchLower)) ||
          (dealer.Lead_ID && dealer.Lead_ID.toLowerCase().includes(searchLower)) ||
          (dealer.OMC && dealer.OMC.toLowerCase().includes(searchLower)) ||
          (dealer.Current_Address_Locality &&
            dealer.Current_Address_Locality.toLowerCase().includes(searchLower)) ||
          (dealer.Current_Address_State &&
            dealer.Current_Address_State.toLowerCase().includes(searchLower)) ||
          (dealer.Employee_Name && dealer.Employee_Name.toLowerCase().includes(searchLower)) ||
          (dealer.Primary_Mobile && String(dealer.Primary_Mobile).includes(searchLower)) ||
          (dealer.Status && dealer.Status.toLowerCase().includes(searchLower))
      );
    }

    // Pagination
    const totallength = filteredDealers.length;
    const skip = parseInt(first);
    const limit = parseInt(rows);
    const paginatedDealers = filteredDealers.slice(skip, skip + limit);

    // Send response
    res.send({
      success: true,
      resdata: paginatedDealers,
      totallength,
      userRole,
    });
  } catch (err) {
    console.error('Error fetching salesperson dealers:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch dealers',
      error: err.message,
    });
  }
};

// ---------- mobile app for showing map markers ----------

export const getalldealersforMap = async (req, res, next) => {
  try {
    const { globalfilter, colfilter } = req.query;

    const fieldArray = Object.keys(Dealer.schema.obj);

    const globalFilter = globalfilter
      ? {
          $or: fieldArray
            .filter(
              (field) =>
                Dealer.schema.path(field) instanceof
                mongoose.Schema.Types.String
            )
            .map((field) => ({
              [field]: {
                $regex: globalfilter,
                $options: 'i',
              },
            })),
        }
      : {};

    let filter = colfilter
      ? { ...globalFilter, ...colfilter }
      : globalFilter;

    // Sales_Man only sees their own dealers
    // if (req.user.Role === 'Sales_Man') {
    //   filter = {
    //     ...filter,
    //     Employee_ID: String(req.user._id || req.user.id),
    //   };
    // }

    // Get all dealers without pagination
    const resdata = await Dealer.find(filter);

    const totallength = resdata.length;

    res.send({ resdata, totallength });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};