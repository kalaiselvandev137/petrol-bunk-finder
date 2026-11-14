import { Borrower } from "../models/BorrowerModel.js"
import { Employee } from "../models/EmployeeModel.js"
import { Dealer } from "../models/DealerModel.js"
import { Saveimages } from "../services/Imageservice.js";
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';



export const getallBorrowers = async (req, res, next) => {
  try {
    const { first, rows, globalfilter, colfilter } = req.query;
    // const userRole = req.user.Role;
    // const userName = req.user.Name;
    const fieldArray = Object.keys(Borrower.schema.obj);
    const globalFilter = globalfilter ? {$or: fieldArray.filter((field) => Borrower.schema.path(field) instanceof mongoose.Schema.Types.String).map((field) => ({ [field]: { $regex: globalfilter, $options: 'i' } }))}: {};
    let filter = colfilter ? { ...globalFilter, ...colfilter } : globalFilter;
    // if (userRole === 'Sales_Man') {filter = {...filter,Sales_Man: userName};}
    if (req.user.Role === 'Sales_Man') {filter = {...filter,Sales_Man: req.user.Name};}
    const resdata = await Borrower.find(filter).skip(first).limit(rows);
    const totallength = await Borrower.countDocuments(filter);
    res.send({ resdata, totallength });
  } catch (err) {
    console.error(err);
    res.send('Internal Server Error');
  }
};

export const saveBorrower = async (req, res, next) => {
  try {
      if (req.file) {
          req.body.Image = await Saveimages(req.file, 'Borrowers');
      }
      
      console.log("Request body after adding image path:", req.body);
      
      const resdata = await new Borrower(req.body).save();
      res.send(resdata);
  } catch (err) {
      console.error("Error saving Borrower:", err);
      res.send({ message: 'Error saving Borrower' });
  }
};

export const updateBorrower = async (req, res, next) => {
  try {
    const { _id } = req.query;  
    if (req.file) {
      req.body.Image = await Saveimages(req.file, 'Borrowers');
    }
    const updatedBorrower = await Borrower.findOneAndUpdate({ _id },{ $set: req.body }, { new: true });
    if (!updatedBorrower) {
      return res.send({ message: 'Borrower not found' });
    }
    res.send(updatedBorrower);
  } catch (err) {
    console.error("Error updating Borrower:", err);
    res.send({ message: 'Error updating Borrower' });
  }
};

export const deleteBorrower = async (req, res, next) => {
  try {
    const { _id } = req.query
    const resdata = await Borrower.deleteOne({ _id })
    res.send(resdata)
  } catch (err) {
    console.error(err)
  }
}

// Bulk Upload Controller
// export const bulkUploadBorrowers = async (req, res, next) => {
//   try {
//     if (!req.file) {
//       return res.status(400).send({ message: 'No file uploaded' });
//     }

//     // Read the Excel file
//     const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
    
//     // Convert to JSON
//     const jsonData = XLSX.utils.sheet_to_json(worksheet);

//     if (!jsonData || jsonData.length === 0) {
//       return res.status(400).send({ message: 'Excel file is empty' });
//     }

//     // Field mapping from Excel headers to database fields
//     // Updated to include both 'Sales Man' and 'Sales_Man' for robustness
//     const fieldMapping = {
//       'Lead ID': 'Lead_ID',
//       'Program ID': 'Program_ID',
//       'Program Name': 'Program_Name',
//       'Routed Program Name': 'Routed_Program_Name',
//       'RM Name': 'RM_Name',
//       'Dharamshi Senchinl A': 'Dharamshi_Senchinl_A',
//       'Lender Ref ID': 'Lender_Ref_ID',
//       'Partner Ref ID': 'Partner_Ref_ID',
//       'Account Ref ID': 'Account_Ref_ID',
//       'Business Name': 'Business_Name',
//       'Primary Mobile': 'Primary_Mobile',
//       'Business PAN': 'Business_PAN',
//       'Business GSTin': 'Business_GSTin',
//       'Business Type': 'Business_Type',
//       'CIN Number': 'CIN_Number',
//       'Business Sector': 'Business_Sector',
//       'Industry Type': 'Industry_Type',
//       'Sub Industry Type': 'Sub_Industry_Type',
//       'Date of Incorporation': 'Date_of_Incorporation',
//       'Overall Vintage in Months': 'Overall_Vintage_in_Months',
//       'Vintage with Partner in Months': 'Vintage_with_Partner_in_Months',
//       'Last 6 Months Sale with Partner': 'Last_6_Months_Sale_with_Partner',
//       'Last 12 Months Sale with Partner': 'Last_12_Months_Sale_with_Partner',
//       'Name': 'Name',
//       'Father\'s Name': 'Father_Name',
//       'Aadhaar': 'Aadhaar',
//       'PAN': 'PAN',
//       'DOB': 'DOB',
//       'Gender': 'Gender',
//       'Employment Status': 'Employment_Status',
//       'Designation': 'Designation',
//       'Primary Email': 'Primary_Email',
//       'Secondary Mobile': 'Secondary_Mobile',
//       'Disbursement Bank IFSC': 'Disbursement_Bank_IFSC',
//       'Disbursement Bank Account No.': 'Disbursement_Bank_Account_No',
//       'Disbursement Bank Account Holder Name': 'Disbursement_Bank_Account_Holder_Name',
//       'Disbursement Bank Account Type': 'Disbursement_Bank_Account_Type',
//       'Current Address Line': 'Current_Address_Line',
//       'Current Address Locality': 'Current_Address_Locality',
//       // FIXED: Added both variations to handle either format
//       'Sales Man': 'Sales_Man',
//       'Sales_Man': 'Sales_Man',
//       'Current Address Pincode': 'Current_Address_Pincode',
//       'Current Address State': 'Current_Address_State',
//       'Line Activation Date': 'Line_Activation_Date',
//       'Approved Line Amount': 'Approved_Line_Amount',
//       'Operative Line Amount': 'Operative_Line_Amount',
//       'Max Active Drawdowns': 'Max_Active_Drawdowns',
//       'Active Line Amount': 'Active_Line_Amount',
//       'Line Expiry Date': 'Line_Expiry_Date',
//       'Adhoc Line Amount': 'Adhoc_Line_Amount',
//       'Adhoc Line Activation Date': 'Adhoc_Line_Activation_Date',
//       'Adhoc Line Expiry Date': 'Adhoc_Line_Expiry_Date',
//       'DPD': 'DPD',
//       'Days in Month': 'Days_in_Month',
//       'Days in Year': 'Days_in_Year',
//       'Tenure Period': 'Tenure_Period',
//       'Tenure Value': 'Tenure_Value',
//       'Tenure Period Type': 'Tenure_Period_Type',
//       'Tenure Starts At': 'Tenure_Starts_At',
//       'ROI Period': 'ROI_Period',
//       'ROI Slab Based?': 'ROI_Slab_Based',
//       'ROI Value': 'ROI_Value',
//       'Overdue Same as ROI?': 'Overdue_Same_as_ROI',
//       'Overdue Slab Based?': 'Overdue_Slab_Based',
//       'Overdue ROI Value': 'Overdue_ROI_Value',
//       'Penal Same as ROI?': 'Penal_Same_as_ROI',
//       'Penal Slab Based?': 'Penal_Slab_Based',
//       'Penal Value': 'Penal_Value',
//       'Penal Tax': 'Penal_Tax',
//       'Penal Lag Days': 'Penal_Lag_Days',
//       'Penal Calculation Type': 'Penal_Calculation_Type',
//       'Interest Starts': 'Interest_Starts',
//       'Interest Lock-in Enabled?': 'Interest_Lock_in_Enabled',
//       'Interest Lock-in days': 'Interest_Lock_in_days',
//       'Upfront Interest Enabled?': 'Upfront_Interest_Enabled',
//       'Upfront Interest Value Type': 'Upfront_Interest_Value_Type',
//       'Upfront Interest Value': 'Upfront_Interest_Value',
//       'Upfront Interest Days': 'Upfront_Interest_Days',
//       'Cashback Enabled?': 'Cashback_Enabled',
//       'Cashback Payment To': 'Cashback_Payment_To',
//       'Cashback Release At': 'Cashback_Release_At',
//       'Cashback Use As': 'Cashback_Use_As',
//       'Cashback Deduction Enabled?': 'Cashback_Deduction_Enabled',
//       'Cashback Deduction Type': 'Cashback_Deduction_Type',
//       'Cashback Deduction Value': 'Cashback_Deduction_Value',
//       'Holdback Enabled?': 'Holdback_Enabled',
//       'Holdback Rate': 'Holdback_Rate',
//       'Holdback Return Enabled?': 'Holdback_Return_Enabled',
//       'Holdback Return Payment To': 'Holdback_Return_Payment_To',
//       'Margin Enabled?': 'Margin_Enabled',
//       'Margin Value Type': 'Margin_Value_Type',
//       'Margin Value': 'Margin_Value',
//       'Margin Receive Before Disbursement?': 'Margin_Receive_Before_Disbursement',
//       'PF Enabled?': 'PF_Enabled',
//       'PF Value Type': 'PF_Value_Type',
//       'PF Value': 'PF_Value',
//       'PF GST': 'PF_GST',
//       'EMI Count': 'EMI_Count',
//       'EMI Dates': 'EMI_Dates',
//       'EMI Frequency': 'EMI_Frequency',
//       'Pre EMI Enabled?': 'Pre_EMI_Enabled',
//       'Pre EMI Period': 'Pre_EMI_Period',
//       'Extend Pre EMI?': 'Extend_Pre_EMI',
//       'Co Lending Split': 'Co_Lending_Split'
//     };

//     // Transform data
//     const transformedData = jsonData.map((row) => {
//       const newRow = {};
      
//       for (const [excelKey, dbKey] of Object.entries(fieldMapping)) {
//         if (row[excelKey] !== undefined && row[excelKey] !== null && row[excelKey] !== '') {
//           // Handle date fields
//           if (dbKey.includes('Date') || dbKey === 'DOB') {
//             if (typeof row[excelKey] === 'number') {
//               // Excel date serial number
//               const date = XLSX.SSF.parse_date_code(row[excelKey]);
//               newRow[dbKey] = new Date(date.y, date.m - 1, date.d);
//             } else if (row[excelKey]) {
//               newRow[dbKey] = new Date(row[excelKey]);
//             }
//           }
//           // Handle number fields
//           else if (dbKey.includes('Amount') || dbKey.includes('Value') || 
//                    dbKey.includes('Months') || dbKey.includes('Count') ||
//                    dbKey.includes('Days') || dbKey === 'DPD' ||
//                    dbKey.includes('Rate') || dbKey.includes('Tax') ||
//                    dbKey.includes('GST') || dbKey.includes('Period')) {
//             newRow[dbKey] = Number(row[excelKey]) || 0;
//           }
//           // Handle string fields
//           else {
//             newRow[dbKey] = String(row[excelKey]).trim();
//           }
//         }
//       }
      
//       return newRow;
//     });

//     // Filter out empty rows
//     const validData = transformedData.filter(row => {
//       return Object.keys(row).length > 0;
//     });

//     if (validData.length === 0) {
//       return res.status(400).send({ message: 'No valid data found in Excel file' });
//     }

//     // Bulk insert
//     const insertedBorrowers = await Borrower.insertMany(validData, { 
//       ordered: false,
//       rawResult: true 
//     });

//     res.send({
//       success: true,
//       message: `Successfully uploaded ${insertedBorrowers.insertedCount} borrowers`,
//       insertedCount: insertedBorrowers.insertedCount,
//       totalRows: jsonData.length
//     });

//   } catch (err) {
//     console.error("Error bulk uploading borrowers:", err);
    
//     if (err.name === 'BulkWriteError') {
//       return res.status(400).send({ 
//         message: 'Some records failed to upload',
//         insertedCount: err.result.nInserted,
//         errors: err.writeErrors
//       });
//     }
    
//     res.status(500).send({ 
//       message: 'Error bulk uploading borrowers',
//       error: err.message 
//     });
//   }
// };

//new one
// export const bulkUploadBorrowers = async (req, res, next) => {
//   try {
//     if (!req.file) {
//       return res.status(400).send({ message: 'No file uploaded' });
//     }

//     // Read the Excel file
//     const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
    
//     // Convert to JSON
//     const jsonData = XLSX.utils.sheet_to_json(worksheet);

//     if (!jsonData || jsonData.length === 0) {
//       return res.status(400).send({ message: 'Excel file is empty' });
//     }

//     // Field mapping from Excel headers to database fields
//     const fieldMapping = {
//       'Lead ID': 'Lead_ID',
//       'Program ID': 'Program_ID',
//       'Program Name': 'Program_Name',
//       'Routed Program Name': 'Routed_Program_Name',
//       'RM Name': 'RM_Name',
//       'Dharamshi Senchinl A': 'Dharamshi_Senchinl_A',
//       'Lender Ref ID': 'Lender_Ref_ID',
//       'Partner Ref ID': 'Partner_Ref_ID',
//       'Account Ref ID': 'Account_Ref_ID',
//       'Business Name': 'Business_Name',
//       'Primary Mobile': 'Primary_Mobile',
//       'Business PAN': 'Business_PAN',
//       'Business GSTin': 'Business_GSTin',
//       'Business Type': 'Business_Type',
//       'CIN Number': 'CIN_Number',
//       'Business Sector': 'Business_Sector',
//       'Industry Type': 'Industry_Type',
//       'Sub Industry Type': 'Sub_Industry_Type',
//       'Date of Incorporation': 'Date_of_Incorporation',
//       'Overall Vintage in Months': 'Overall_Vintage_in_Months',
//       'Vintage with Partner in Months': 'Vintage_with_Partner_in_Months',
//       'Last 6 Months Sale with Partner': 'Last_6_Months_Sale_with_Partner',
//       'Last 12 Months Sale with Partner': 'Last_12_Months_Sale_with_Partner',
//       'Name': 'Name',
//       'Father\'s Name': 'Father_Name',
//       'Aadhaar': 'Aadhaar',
//       'PAN': 'PAN',
//       'DOB': 'DOB',
//       'Gender': 'Gender',
//       'Employment Status': 'Employment_Status',
//       'Designation': 'Designation',
//       'Primary Email': 'Primary_Email',
//       'Secondary Mobile': 'Secondary_Mobile',
//       'Disbursement Bank IFSC': 'Disbursement_Bank_IFSC',
//       'Disbursement Bank Account No.': 'Disbursement_Bank_Account_No',
//       'Disbursement Bank Account Holder Name': 'Disbursement_Bank_Account_Holder_Name',
//       'Disbursement Bank Account Type': 'Disbursement_Bank_Account_Type',
//       'Current Address Line': 'Current_Address_Line',
//       'Current Address Locality': 'Current_Address_Locality',
//       'Sales Man': 'Sales_Man',
//       'Sales_Man': 'Sales_Man',
//       'Current Address Pincode': 'Current_Address_Pincode',
//       'Current Address State': 'Current_Address_State',
//       'Line Activation Date': 'Line_Activation_Date',
//       'Approved Line Amount': 'Approved_Line_Amount',
//       'Operative Line Amount': 'Operative_Line_Amount',
//       'Max Active Drawdowns': 'Max_Active_Drawdowns',
//       'Active Line Amount': 'Active_Line_Amount',
//       'Line Expiry Date': 'Line_Expiry_Date',
//       'Adhoc Line Amount': 'Adhoc_Line_Amount',
//       'Adhoc Line Activation Date': 'Adhoc_Line_Activation_Date',
//       'Adhoc Line Expiry Date': 'Adhoc_Line_Expiry_Date',
//       'DPD': 'DPD',
//       'Days in Month': 'Days_in_Month',
//       'Days in Year': 'Days_in_Year',
//       'Tenure Period': 'Tenure_Period',
//       'Tenure Value': 'Tenure_Value',
//       'Tenure Period Type': 'Tenure_Period_Type',
//       'Tenure Starts At': 'Tenure_Starts_At',
//       'ROI Period': 'ROI_Period',
//       'ROI Slab Based?': 'ROI_Slab_Based',
//       'ROI Value': 'ROI_Value',
//       'Overdue Same as ROI?': 'Overdue_Same_as_ROI',
//       'Overdue Slab Based?': 'Overdue_Slab_Based',
//       'Overdue ROI Value': 'Overdue_ROI_Value',
//       'Penal Same as ROI?': 'Penal_Same_as_ROI',
//       'Penal Slab Based?': 'Penal_Slab_Based',
//       'Penal Value': 'Penal_Value',
//       'Penal Tax': 'Penal_Tax',
//       'Penal Lag Days': 'Penal_Lag_Days',
//       'Penal Calculation Type': 'Penal_Calculation_Type',
//       'Interest Starts': 'Interest_Starts',
//       'Interest Lock-in Enabled?': 'Interest_Lock_in_Enabled',
//       'Interest Lock-in days': 'Interest_Lock_in_days',
//       'Upfront Interest Enabled?': 'Upfront_Interest_Enabled',
//       'Upfront Interest Value Type': 'Upfront_Interest_Value_Type',
//       'Upfront Interest Value': 'Upfront_Interest_Value',
//       'Upfront Interest Days': 'Upfront_Interest_Days',
//       'Cashback Enabled?': 'Cashback_Enabled',
//       'Cashback Payment To': 'Cashback_Payment_To',
//       'Cashback Release At': 'Cashback_Release_At',
//       'Cashback Use As': 'Cashback_Use_As',
//       'Cashback Deduction Enabled?': 'Cashback_Deduction_Enabled',
//       'Cashback Deduction Type': 'Cashback_Deduction_Type',
//       'Cashback Deduction Value': 'Cashback_Deduction_Value',
//       'Holdback Enabled?': 'Holdback_Enabled',
//       'Holdback Rate': 'Holdback_Rate',
//       'Holdback Return Enabled?': 'Holdback_Return_Enabled',
//       'Holdback Return Payment To': 'Holdback_Return_Payment_To',
//       'Margin Enabled?': 'Margin_Enabled',
//       'Margin Value Type': 'Margin_Value_Type',
//       'Margin Value': 'Margin_Value',
//       'Margin Receive Before Disbursement?': 'Margin_Receive_Before_Disbursement',
//       'PF Enabled?': 'PF_Enabled',
//       'PF Value Type': 'PF_Value_Type',
//       'PF Value': 'PF_Value',
//       'PF GST': 'PF_GST',
//       'EMI Count': 'EMI_Count',
//       'EMI Dates': 'EMI_Dates',
//       'EMI Frequency': 'EMI_Frequency',
//       'Pre EMI Enabled?': 'Pre_EMI_Enabled',
//       'Pre EMI Period': 'Pre_EMI_Period',
//       'Extend Pre EMI?': 'Extend_Pre_EMI',
//       'Co Lending Split': 'Co_Lending_Split'
//     };

//     // Transform data
//     const transformedData = jsonData.map((row) => {
//       const newRow = {};
      
//       for (const [excelKey, dbKey] of Object.entries(fieldMapping)) {
//         if (row[excelKey] !== undefined && row[excelKey] !== null && row[excelKey] !== '') {
//           // Handle date fields
//           if (dbKey.includes('Date') || dbKey === 'DOB') {
//             if (typeof row[excelKey] === 'number') {
//               // Excel date serial number
//               const date = XLSX.SSF.parse_date_code(row[excelKey]);
//               newRow[dbKey] = new Date(date.y, date.m - 1, date.d);
//             } else if (row[excelKey]) {
//               newRow[dbKey] = new Date(row[excelKey]);
//             }
//           }
//           // Handle number fields
//           else if (dbKey.includes('Amount') || dbKey.includes('Value') || 
//                    dbKey.includes('Months') || dbKey.includes('Count') ||
//                    dbKey.includes('Days') || dbKey === 'DPD' ||
//                    dbKey.includes('Rate') || dbKey.includes('Tax') ||
//                    dbKey.includes('GST') || dbKey.includes('Period')) {
//             newRow[dbKey] = Number(row[excelKey]) || 0;
//           }
//           // Handle string fields
//           else {
//             newRow[dbKey] = String(row[excelKey]).trim();
//           }
//         }
//       }
      
//       return newRow;
//     });

//     // Filter out empty rows
//     const validData = transformedData.filter(row => {
//       return Object.keys(row).length > 0;
//     });

//     if (validData.length === 0) {
//       return res.status(400).send({ message: 'No valid data found in Excel file' });
//     }

//     // Process each record to handle salesperson and dealer creation
//     const borrowersToInsert = [];
//     const dealersToCreate = [];
//     let borrowersInserted = 0;
//     let dealersCreated = 0;
//     let dealersUpdated = 0;

//     for (const record of validData) {
//       let employeeData = null;
      
//       // Check if Sales_Man exists in the record
//       if (record.Sales_Man) {
//         // Search for employee by name (case-insensitive search)
//         // You can modify this to search by email, mobile, or employee ID as needed
//         employeeData = await Employee.findOne({
//           $or: [
//             { First_Name: new RegExp(`^${record.Sales_Man}$`, 'i') },
//             { Last_Name: new RegExp(`^${record.Sales_Man}$`, 'i') },
//             { 
//               $expr: {
//                 $regexMatch: {
//                   input: { $concat: ['$First_Name', ' ', '$Last_Name'] },
//                   regex: new RegExp(`^${record.Sales_Man}$`, 'i')
//                 }
//               }
//             }
//           ]
//         });
//       }

//       if (employeeData) {
//         // Employee exists - save to borrowers collection
//         borrowersToInsert.push(record);
        
//         // Also create/update dealer record with employee info
//         const dealerData = {
//           Lead_ID: record.Lead_ID,
//           Program_Name: record.Program_Name,
//           Primary_Mobile: record.Primary_Mobile,
//           Current_Address_State: record.Current_Address_State,
//           Approved_Line_Amount: record.Approved_Line_Amount?.toString() || '',
//           Active_Line_Amount: record.Active_Line_Amount?.toString() || '',
//           Line_Activation_Date: record.Line_Activation_Date?.toString() || '',
//           Employee_ID: employeeData._id,
//           Employee_Name: `${employeeData.First_Name} ${employeeData.Last_Name}`.trim(),
//           Status: 'Active'
//         };

//         // Check if dealer already exists for this Lead_ID
//         const existingDealer = await Dealer.findOne({ Lead_ID: record.Lead_ID });
        
//         if (existingDealer) {
//           // Update existing dealer
//           await Dealer.updateOne(
//             { Lead_ID: record.Lead_ID },
//             { $set: dealerData }
//           );
//           dealersUpdated++;
//         } else {
//           // Create new dealer
//           dealersToCreate.push(dealerData);
//         }
//       } else {
//         // Employee not found - save remaining data to dealer collection only
//         const dealerData = {
//           Lead_ID: record.Lead_ID,
//           Program_Name: record.Program_Name,
//           Primary_Mobile: record.Primary_Mobile,
//           Current_Address_State: record.Current_Address_State,
//           Approved_Line_Amount: record.Approved_Line_Amount?.toString() || '',
//           Active_Line_Amount: record.Active_Line_Amount?.toString() || '',
//           Line_Activation_Date: record.Line_Activation_Date?.toString() || '',
//           Employee_ID: null, // or you can create a placeholder employee
//           Employee_Name: record.Sales_Man || 'Unknown',
//           Status: 'Inactive' // Mark as inactive since salesperson not found
//         };

//         // Check if dealer already exists
//         const existingDealer = await Dealer.findOne({ Lead_ID: record.Lead_ID });
        
//         if (!existingDealer) {
//           dealersToCreate.push(dealerData);
//         }
//       }
//     }

//     // Bulk insert borrowers
//     if (borrowersToInsert.length > 0) {
//       const insertedBorrowers = await Borrower.insertMany(borrowersToInsert, { 
//         ordered: false,
//         rawResult: true 
//       });
//       borrowersInserted = insertedBorrowers.insertedCount;
//     }

//     // Bulk insert dealers
//     if (dealersToCreate.length > 0) {
//       const insertedDealers = await Dealer.insertMany(dealersToCreate, { 
//         ordered: false 
//       });
//       dealersCreated = insertedDealers.length;
//     }

//     res.send({
//       success: true,
//       message: 'Upload completed successfully',
//       summary: {
//         totalRows: jsonData.length,
//         borrowersInserted: borrowersInserted,
//         dealersCreated: dealersCreated,
//         dealersUpdated: dealersUpdated,
//         totalDealers: dealersCreated + dealersUpdated
//       }
//     });

//   } catch (err) {
//     console.error("Error bulk uploading borrowers:", err);
    
//     if (err.name === 'BulkWriteError') {
//       return res.status(400).send({ 
//         message: 'Some records failed to upload',
//         insertedCount: err.result.nInserted,
//         errors: err.writeErrors
//       });
//     }
    
//     res.status(500).send({ 
//       message: 'Error bulk uploading borrowers',
//       error: err.message 
//     });
//   }
// };


// export const bulkUploadBorrowers = async (req, res, next) => {
//   try {
//     if (!req.file) {
//       return res.status(400).send({ message: 'No file uploaded' });
//     }

//     // Read the Excel file
//     const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
    
//     // Convert to JSON
//     const jsonData = XLSX.utils.sheet_to_json(worksheet);

//     if (!jsonData || jsonData.length === 0) {
//       return res.status(400).send({ message: 'Excel file is empty' });
//     }

//     // Field mapping from Excel headers to database fields
//     const fieldMapping = {
//       'Lead ID': 'Lead_ID',
//       'Program ID': 'Program_ID',
//       'Program Name': 'Program_Name',
//       'Routed Program Name': 'Routed_Program_Name',
//       'RM Name': 'RM_Name',
//       'Dharamshi Senchinl A': 'Dharamshi_Senchinl_A',
//       'Lender Ref ID': 'Lender_Ref_ID',
//       'Partner Ref ID': 'Partner_Ref_ID',
//       'Account Ref ID': 'Account_Ref_ID',
//       'Business Name': 'Business_Name',
//       'Primary Mobile': 'Primary_Mobile',
//       'Business PAN': 'Business_PAN',
//       'Business GSTin': 'Business_GSTin',
//       'Business Type': 'Business_Type',
//       'CIN Number': 'CIN_Number',
//       'Business Sector': 'Business_Sector',
//       'Industry Type': 'Industry_Type',
//       'Sub Industry Type': 'Sub_Industry_Type',
//       'Date of Incorporation': 'Date_of_Incorporation',
//       'Overall Vintage in Months': 'Overall_Vintage_in_Months',
//       'Vintage with Partner in Months': 'Vintage_with_Partner_in_Months',
//       'Last 6 Months Sale with Partner': 'Last_6_Months_Sale_with_Partner',
//       'Last 12 Months Sale with Partner': 'Last_12_Months_Sale_with_Partner',
//       'Name': 'Name',
//       'Father\'s Name': 'Father_Name',
//       'Aadhaar': 'Aadhaar',
//       'PAN': 'PAN',
//       'DOB': 'DOB',
//       'Gender': 'Gender',
//       'Employment Status': 'Employment_Status',
//       'Designation': 'Designation',
//       'Primary Email': 'Primary_Email',
//       'Secondary Mobile': 'Secondary_Mobile',
//       'Disbursement Bank IFSC': 'Disbursement_Bank_IFSC',
//       'Disbursement Bank Account No.': 'Disbursement_Bank_Account_No',
//       'Disbursement Bank Account Holder Name': 'Disbursement_Bank_Account_Holder_Name',
//       'Disbursement Bank Account Type': 'Disbursement_Bank_Account_Type',
//       'Current Address Line': 'Current_Address_Line',
//       'Current Address Locality': 'Current_Address_Locality',
//       'Sales Man': 'Sales_Man',
//       'Sales_Man': 'Sales_Man',
//       'Current Address Pincode': 'Current_Address_Pincode',
//       'Current Address State': 'Current_Address_State',
//       'Line Activation Date': 'Line_Activation_Date',
//       'Approved Line Amount': 'Approved_Line_Amount',
//       'Operative Line Amount': 'Operative_Line_Amount',
//       'Max Active Drawdowns': 'Max_Active_Drawdowns',
//       'Active Line Amount': 'Active_Line_Amount',
//       'Line Expiry Date': 'Line_Expiry_Date',
//       'Adhoc Line Amount': 'Adhoc_Line_Amount',
//       'Adhoc Line Activation Date': 'Adhoc_Line_Activation_Date',
//       'Adhoc Line Expiry Date': 'Adhoc_Line_Expiry_Date',
//       'DPD': 'DPD',
//       'Days in Month': 'Days_in_Month',
//       'Days in Year': 'Days_in_Year',
//       'Tenure Period': 'Tenure_Period',
//       'Tenure Value': 'Tenure_Value',
//       'Tenure Period Type': 'Tenure_Period_Type',
//       'Tenure Starts At': 'Tenure_Starts_At',
//       'ROI Period': 'ROI_Period',
//       'ROI Slab Based?': 'ROI_Slab_Based',
//       'ROI Value': 'ROI_Value',
//       'Overdue Same as ROI?': 'Overdue_Same_as_ROI',
//       'Overdue Slab Based?': 'Overdue_Slab_Based',
//       'Overdue ROI Value': 'Overdue_ROI_Value',
//       'Penal Same as ROI?': 'Penal_Same_as_ROI',
//       'Penal Slab Based?': 'Penal_Slab_Based',
//       'Penal Value': 'Penal_Value',
//       'Penal Tax': 'Penal_Tax',
//       'Penal Lag Days': 'Penal_Lag_Days',
//       'Penal Calculation Type': 'Penal_Calculation_Type',
//       'Interest Starts': 'Interest_Starts',
//       'Interest Lock-in Enabled?': 'Interest_Lock_in_Enabled',
//       'Interest Lock-in days': 'Interest_Lock_in_days',
//       'Upfront Interest Enabled?': 'Upfront_Interest_Enabled',
//       'Upfront Interest Value Type': 'Upfront_Interest_Value_Type',
//       'Upfront Interest Value': 'Upfront_Interest_Value',
//       'Upfront Interest Days': 'Upfront_Interest_Days',
//       'Cashback Enabled?': 'Cashback_Enabled',
//       'Cashback Payment To': 'Cashback_Payment_To',
//       'Cashback Release At': 'Cashback_Release_At',
//       'Cashback Use As': 'Cashback_Use_As',
//       'Cashback Deduction Enabled?': 'Cashback_Deduction_Enabled',
//       'Cashback Deduction Type': 'Cashback_Deduction_Type',
//       'Cashback Deduction Value': 'Cashback_Deduction_Value',
//       'Holdback Enabled?': 'Holdback_Enabled',
//       'Holdback Rate': 'Holdback_Rate',
//       'Holdback Return Enabled?': 'Holdback_Return_Enabled',
//       'Holdback Return Payment To': 'Holdback_Return_Payment_To',
//       'Margin Enabled?': 'Margin_Enabled',
//       'Margin Value Type': 'Margin_Value_Type',
//       'Margin Value': 'Margin_Value',
//       'Margin Receive Before Disbursement?': 'Margin_Receive_Before_Disbursement',
//       'PF Enabled?': 'PF_Enabled',
//       'PF Value Type': 'PF_Value_Type',
//       'PF Value': 'PF_Value',
//       'PF GST': 'PF_GST',
//       'EMI Count': 'EMI_Count',
//       'EMI Dates': 'EMI_Dates',
//       'EMI Frequency': 'EMI_Frequency',
//       'Pre EMI Enabled?': 'Pre_EMI_Enabled',
//       'Pre EMI Period': 'Pre_EMI_Period',
//       'Extend Pre EMI?': 'Extend_Pre_EMI',
//       'Co Lending Split': 'Co_Lending_Split'
//     };

//     // Transform data
//     const transformedData = jsonData.map((row) => {
//       const newRow = {};
      
//       for (const [excelKey, dbKey] of Object.entries(fieldMapping)) {
//         if (row[excelKey] !== undefined && row[excelKey] !== null && row[excelKey] !== '') {
//           // Handle date fields
//           if (dbKey.includes('Date') || dbKey === 'DOB') {
//             if (typeof row[excelKey] === 'number') {
//               // Excel date serial number
//               const date = XLSX.SSF.parse_date_code(row[excelKey]);
//               newRow[dbKey] = new Date(date.y, date.m - 1, date.d);
//             } else if (row[excelKey]) {
//               newRow[dbKey] = new Date(row[excelKey]);
//             }
//           }
//           // Handle number fields
//           else if (dbKey.includes('Amount') || dbKey.includes('Value') || 
//                    dbKey.includes('Months') || dbKey.includes('Count') ||
//                    dbKey.includes('Days') || dbKey === 'DPD' ||
//                    dbKey.includes('Rate') || dbKey.includes('Tax') ||
//                    dbKey.includes('GST') || dbKey.includes('Period')) {
//             newRow[dbKey] = Number(row[excelKey]) || 0;
//           }
//           // Handle string fields
//           else {
//             newRow[dbKey] = String(row[excelKey]).trim();
//           }
//         }
//       }
      
//       return newRow;
//     });

//     // Filter out empty rows
//     const validData = transformedData.filter(row => {
//       return Object.keys(row).length > 0;
//     });

//     if (validData.length === 0) {
//       return res.status(400).send({ message: 'No valid data found in Excel file' });
//     }

//     // Bulk insert borrowers (save all data as it comes)
//     const insertedBorrowers = await Borrower.insertMany(validData, { 
//       ordered: false,
//       rawResult: true 
//     });

//     // Prepare dealer data from the same records
//     const dealersData = validData.map(record => ({
//       Lead_ID: record.Lead_ID,
//       Business_Name: record.Business_Name,
//       Primary_Mobile: record.Primary_Mobile,
//       Current_Address_Line: record.Current_Address_Line,
//       Current_Address_Locality: record.Current_Address_Locality,
//       Current_Address_State: record.Current_Address_State,
//       Approved_Line_Amount: record.Approved_Line_Amount?.toString() || '',
//       Active_Line_Amount: record.Active_Line_Amount?.toString() || '',
//       Line_Activation_Date: record.Line_Activation_Date?.toString() || '',
//       Employee_ID: null, // Will be updated later when employee mapping is done
//       Employee_Name: record.Sales_Man || 'Unknown',
//       // Status: 'Inactive'
//     }));

//     // Bulk insert dealers
//     const insertedDealers = await Dealer.insertMany(dealersData, { 
//       ordered: false 
//     });

//     res.send({
//       success: true,
//       message: `Successfully uploaded ${insertedBorrowers.insertedCount} borrowers and ${insertedDealers.length} dealers`,
//       insertedCount: insertedBorrowers.insertedCount,
//       dealersCount: insertedDealers.length,
//       totalRows: jsonData.length
//     });

//   } catch (err) {
//     console.error("Error bulk uploading borrowers:", err);
    
//     if (err.name === 'BulkWriteError') {
//       return res.status(400).send({ 
//         message: 'Some records failed to upload',
//         insertedCount: err.result.nInserted,
//         errors: err.writeErrors
//       });
//     }
    
//     res.status(500).send({ 
//       message: 'Error bulk uploading borrowers',
//       error: err.message 
//     });
//   }
// };



export const bulkUploadBorrowers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded' });
    }

    // Read the Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).send({ message: 'Excel file is empty' });
    }

    // Field mapping from Excel headers to database fields
    const fieldMapping = {
      'Lead ID': 'Lead_ID',
      'Program ID': 'Program_ID',
      'Program Name': 'Program_Name',
      'Routed Program Name': 'Routed_Program_Name',
      'RM Name': 'RM_Name',
      'Dharamshi Senchinl A': 'Dharamshi_Senchinl_A',
      'Lender Ref ID': 'Lender_Ref_ID',
      'Partner Ref ID': 'Partner_Ref_ID',
      'Account Ref ID': 'Account_Ref_ID',
      'Business Name': 'Business_Name',
      'Primary Mobile': 'Primary_Mobile',
      'Business PAN': 'Business_PAN',
      'Business GSTin': 'Business_GSTin',
      'Business Type': 'Business_Type',
      'CIN Number': 'CIN_Number',
      'Business Sector': 'Business_Sector',
      'Industry Type': 'Industry_Type',
      'Sub Industry Type': 'Sub_Industry_Type',
      'Date of Incorporation': 'Date_of_Incorporation',
      'Overall Vintage in Months': 'Overall_Vintage_in_Months',
      'Vintage with Partner in Months': 'Vintage_with_Partner_in_Months',
      'Last 6 Months Sale with Partner': 'Last_6_Months_Sale_with_Partner',
      'Last 12 Months Sale with Partner': 'Last_12_Months_Sale_with_Partner',
      'Name': 'Name',
      'Father\'s Name': 'Father_Name',
      'Aadhaar': 'Aadhaar',
      'PAN': 'PAN',
      'DOB': 'DOB',
      'Gender': 'Gender',
      'Employment Status': 'Employment_Status',
      'Designation': 'Designation',
      'Primary Email': 'Primary_Email',
      'Secondary Mobile': 'Secondary_Mobile',
      'Disbursement Bank IFSC': 'Disbursement_Bank_IFSC',
      'Disbursement Bank Account No.': 'Disbursement_Bank_Account_No',
      'Disbursement Bank Account Holder Name': 'Disbursement_Bank_Account_Holder_Name',
      'Disbursement Bank Account Type': 'Disbursement_Bank_Account_Type',
      'Current Address Line': 'Current_Address_Line',
      'Current Address Locality': 'Current_Address_Locality',
      'Sales Man': 'Sales_Man',
      'Sales_Man': 'Sales_Man',
      'Current Address Pincode': 'Current_Address_Pincode',
      'Current Address State': 'Current_Address_State',
      'Line Activation Date': 'Line_Activation_Date',
      'Approved Line Amount': 'Approved_Line_Amount',
      'Operative Line Amount': 'Operative_Line_Amount',
      'Max Active Drawdowns': 'Max_Active_Drawdowns',
      'Active Line Amount': 'Active_Line_Amount',
      'Line Expiry Date': 'Line_Expiry_Date',
      'Adhoc Line Amount': 'Adhoc_Line_Amount',
      'Adhoc Line Activation Date': 'Adhoc_Line_Activation_Date',
      'Adhoc Line Expiry Date': 'Adhoc_Line_Expiry_Date',
      'DPD': 'DPD',
      'Days in Month': 'Days_in_Month',
      'Days in Year': 'Days_in_Year',
      'Tenure Period': 'Tenure_Period',
      'Tenure Value': 'Tenure_Value',
      'Tenure Period Type': 'Tenure_Period_Type',
      'Tenure Starts At': 'Tenure_Starts_At',
      'ROI Period': 'ROI_Period',
      'ROI Slab Based?': 'ROI_Slab_Based',
      'ROI Value': 'ROI_Value',
      'Overdue Same as ROI?': 'Overdue_Same_as_ROI',
      'Overdue Slab Based?': 'Overdue_Slab_Based',
      'Overdue ROI Value': 'Overdue_ROI_Value',
      'Penal Same as ROI?': 'Penal_Same_as_ROI',
      'Penal Slab Based?': 'Penal_Slab_Based',
      'Penal Value': 'Penal_Value',
      'Penal Tax': 'Penal_Tax',
      'Penal Lag Days': 'Penal_Lag_Days',
      'Penal Calculation Type': 'Penal_Calculation_Type',
      'Interest Starts': 'Interest_Starts',
      'Interest Lock-in Enabled?': 'Interest_Lock_in_Enabled',
      'Interest Lock-in days': 'Interest_Lock_in_days',
      'Upfront Interest Enabled?': 'Upfront_Interest_Enabled',
      'Upfront Interest Value Type': 'Upfront_Interest_Value_Type',
      'Upfront Interest Value': 'Upfront_Interest_Value',
      'Upfront Interest Days': 'Upfront_Interest_Days',
      'Cashback Enabled?': 'Cashback_Enabled',
      'Cashback Payment To': 'Cashback_Payment_To',
      'Cashback Release At': 'Cashback_Release_At',
      'Cashback Use As': 'Cashback_Use_As',
      'Cashback Deduction Enabled?': 'Cashback_Deduction_Enabled',
      'Cashback Deduction Type': 'Cashback_Deduction_Type',
      'Cashback Deduction Value': 'Cashback_Deduction_Value',
      'Holdback Enabled?': 'Holdback_Enabled',
      'Holdback Rate': 'Holdback_Rate',
      'Holdback Return Enabled?': 'Holdback_Return_Enabled',
      'Holdback Return Payment To': 'Holdback_Return_Payment_To',
      'Margin Enabled?': 'Margin_Enabled',
      'Margin Value Type': 'Margin_Value_Type',
      'Margin Value': 'Margin_Value',
      'Margin Receive Before Disbursement?': 'Margin_Receive_Before_Disbursement',
      'PF Enabled?': 'PF_Enabled',
      'PF Value Type': 'PF_Value_Type',
      'PF Value': 'PF_Value',
      'PF GST': 'PF_GST',
      'EMI Count': 'EMI_Count',
      'EMI Dates': 'EMI_Dates',
      'EMI Frequency': 'EMI_Frequency',
      'Pre EMI Enabled?': 'Pre_EMI_Enabled',
      'Pre EMI Period': 'Pre_EMI_Period',
      'Extend Pre EMI?': 'Extend_Pre_EMI',
      'Co Lending Split': 'Co_Lending_Split'
    };

    // Transform data
    const transformedData = jsonData.map((row) => {
      const newRow = {};
      
      for (const [excelKey, dbKey] of Object.entries(fieldMapping)) {
        if (row[excelKey] !== undefined && row[excelKey] !== null && row[excelKey] !== '') {
          // Handle date fields
          if (dbKey.includes('Date') || dbKey === 'DOB') {
            if (typeof row[excelKey] === 'number') {
              // Excel date serial number
              const date = XLSX.SSF.parse_date_code(row[excelKey]);
              newRow[dbKey] = new Date(date.y, date.m - 1, date.d);
            } else if (row[excelKey]) {
              newRow[dbKey] = new Date(row[excelKey]);
            }
          }
          // Handle number fields
          else if (dbKey.includes('Amount') || dbKey.includes('Value') || 
                   dbKey.includes('Months') || dbKey.includes('Count') ||
                   dbKey.includes('Days') || dbKey === 'DPD' ||
                   dbKey.includes('Rate') || dbKey.includes('Tax') ||
                   dbKey.includes('GST') || dbKey.includes('Period')) {
            newRow[dbKey] = Number(row[excelKey]) || 0;
          }
          // Handle string fields
          else {
            newRow[dbKey] = String(row[excelKey]).trim();
          }
        }
      }
      
      return newRow;
    });

    // Filter out empty rows
    const validData = transformedData.filter(row => {
      return Object.keys(row).length > 0;
    });

    if (validData.length === 0) {
      return res.status(400).send({ message: 'No valid data found in Excel file' });
    }

    // Bulk insert borrowers (save all data as it comes)
    const insertedBorrowers = await Borrower.insertMany(validData, { 
      ordered: false,
      rawResult: true 
    });

    // Prepare dealer data with employee lookup
    const dealersData = [];
    
    for (const record of validData) {
      let employeeId = null;
      let employeeName = 'No employee allocated';
      
      // Check if Sales_Man exists and lookup employee
      if (record.Sales_Man && record.Sales_Man.trim() !== '') {
        const salesManName = record.Sales_Man.trim();
        
        // Search for employee by matching name (case-insensitive)
        const employee = await Employee.findOne({
          $or: [
            { First_Name: new RegExp(`^${salesManName}$`, 'i') },
            { Last_Name: new RegExp(`^${salesManName}$`, 'i') },
            { 
              $expr: {
                $regexMatch: {
                  input: { $concat: ['$First_Name', ' ', '$Last_Name'] },
                  regex: new RegExp(`^${salesManName}$`, 'i')
                }
              }
            }
          ]
        });
        
        if (employee) {
          employeeId = employee._id;
          // employeeName = `${employee.First_Name} ${employee.Last_Name}`.trim();
          employeeName = `${employee.First_Name} `.trim();

        } else {
          // Employee not found, use the Sales_Man value
          employeeName = salesManName;
        }
      }
      
      dealersData.push({
        Lead_ID: record.Lead_ID,
        Business_Name: record.Business_Name,
        Primary_Mobile: record.Primary_Mobile,
        Current_Address_Line: record.Current_Address_Line,
        Current_Address_Locality: record.Current_Address_Locality,
        Current_Address_State: record.Current_Address_State,
        Approved_Line_Amount: record.Approved_Line_Amount?.toString() || '',
        Active_Line_Amount: record.Active_Line_Amount?.toString() || '',
        Line_Activation_Date: record.Line_Activation_Date?.toString() || '',
        Employee_ID: employeeId,
        Employee_Name: employeeName,
        Status: 'Active'
      });
    }

    // Bulk insert dealers
    const insertedDealers = await Dealer.insertMany(dealersData, { 
      ordered: false 
    });

    res.send({
      success: true,
      message: `Successfully uploaded ${insertedBorrowers.insertedCount} borrowers and ${insertedDealers.length} dealers`,
      insertedCount: insertedBorrowers.insertedCount,
      dealersCount: insertedDealers.length,
      totalRows: jsonData.length
    });

  } catch (err) {
    console.error("Error bulk uploading borrowers:", err);
    
    if (err.name === 'BulkWriteError') {
      return res.status(400).send({ 
        message: 'Some records failed to upload',
        insertedCount: err.result.nInserted,
        errors: err.writeErrors
      });
    }
    
    res.status(500).send({ 
      message: 'Error bulk uploading borrowers',
      error: err.message 
    });
  }
};