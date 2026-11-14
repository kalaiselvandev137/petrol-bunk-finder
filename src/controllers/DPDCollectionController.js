import { DPDCollection } from "../models/DPDCollectionModel.js";
import { Employee } from "../models/EmployeeModel.js";


// export const savedpdcollection = async (req, res, next) => {
//   try {
//     const { Employee_ID, Employee_Name, Date: dateString, Upload_Method, Entries, Status } = req.body;

//     // Validate required fields
//     if (!Employee_ID || !dateString || !Entries || Entries.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields: Employee_ID, Date, and Entries are required'
//       });
//     }

//     console.log(`Processing ${Entries.length} entries for employee ${Employee_Name} on ${dateString}`);

//     const uploadDate = new Date(dateString);
//     uploadDate.setHours(0, 0, 0, 0);

//     // Step 1: Check if collection for TODAY already exists
//     const existingTodayCollection = await DPDCollection.findOne({
//       Employee_ID: Employee_ID,
//       Date: uploadDate
//     });

//     // Step 2: Get the most recent collection BEFORE today
//     const latestPreviousCollection = await DPDCollection.findOne({
//       Employee_ID: Employee_ID,
//       Date: { $lt: uploadDate }
//     }).sort({ Date: -1 });

//     // Step 3: Build map of existing ACTIVE customers from previous collection
//     // ONLY include Pending and Partial status entries
//     const existingCustomersMap = new Map();

//     if (latestPreviousCollection && latestPreviousCollection.Entries && Array.isArray(latestPreviousCollection.Entries)) {
//       latestPreviousCollection.Entries.forEach((entry, index) => {
//         // Only carry forward Pending and Partial status
//         if (entry.Status !== 'Pending' && entry.Status !== 'Partial') {
//           console.log(`Skipping ${entry.Customer_Name} - Status: ${entry.Status} (not Pending/Partial)`);
//           return;
//         }

//         const customerKey = `${entry.Customer_Name}_${String(entry.Contact_No)}`.toLowerCase().trim();
//         existingCustomersMap.set(customerKey, {
//           ...entry,
//           originalIndex: index,
//           collectionId: latestPreviousCollection._id,
//           lastDate: latestPreviousCollection.Date
//         });
//       });
//     }

//     console.log(`Found ${existingCustomersMap.size} active (Pending/Partial) customers from previous collections`);

//     // Step 4: Process incoming entries from NEW UPLOAD
//     const finalEntries = [];
//     const newCustomers = [];
//     const updatedCustomers = [];
//     const collectedToday = [];
//     const removedCustomers = [];
//     const amountUpdates = [];

//     // CRITICAL FIX: Create a Set to track which customers were in the NEW upload
//     const customersInNewUpload = new Set();

//     Entries.forEach(entry => {
//       const customerKey = `${entry.Customer_Name}_${String(entry.Contact_No)}`.toLowerCase().trim();
      
//       // Mark this customer as present in new upload
//       customersInNewUpload.add(customerKey);

//       const normalizedEntry = {
//         ...entry,
//         Contact_No: isNaN(entry.Contact_No) ? entry.Contact_No : Number(entry.Contact_No)
//       };

//       if (existingCustomersMap.has(customerKey)) {
//         // EXISTING CUSTOMER - OVERRIDE WITH NEW DATA
//         const existingData = existingCustomersMap.get(customerKey);

//         const updatedEntry = {
//           ...normalizedEntry,
//           // Store previous values for tracking/history
//           _previousOutstanding: existingData.Sum_Of_Total_Outstanding,
//           _previousDPD: existingData.Max_of_DPD,
//           _previousCollected: existingData.Collecting_Money || 0,
//           _previousStatus: existingData.Status,
//           _lastUpdated: existingData.lastDate,
//           // Override with NEW values from upload
//           Sum_Of_Total_Outstanding: entry.Sum_Of_Total_Outstanding,
//           Max_of_DPD: entry.Max_of_DPD,
//           Status: entry.Status,
//           Collecting_Money: entry.Collecting_Money || existingData.Collecting_Money || 0,
//           // Mark as updated, NOT new
//           _isNew: false,
//           _addedOn: uploadDate // Current date, not old date
//         };

//         finalEntries.push(updatedEntry);
        
//         const outstandingChange = entry.Sum_Of_Total_Outstanding - existingData.Sum_Of_Total_Outstanding;
//         const dpdChange = entry.Max_of_DPD - existingData.Max_of_DPD;
        
//         updatedCustomers.push({
//           name: entry.Customer_Name,
//           contact: entry.Contact_No,
//           oldOutstanding: existingData.Sum_Of_Total_Outstanding,
//           newOutstanding: entry.Sum_Of_Total_Outstanding,
//           outstandingChange: outstandingChange,
//           oldDPD: existingData.Max_of_DPD,
//           newDPD: entry.Max_of_DPD,
//           dpdChange: dpdChange,
//           status: entry.Status,
//           previousStatus: existingData.Status
//         });

//         if (outstandingChange !== 0 || dpdChange !== 0) {
//           amountUpdates.push({
//             name: entry.Customer_Name,
//             outstandingChange: outstandingChange,
//             dpdChange: dpdChange,
//             reason: outstandingChange > 0 ? 'Interest/Penalties Added' : 'Payment Applied'
//           });
//           console.log(`${entry.Customer_Name}: Outstanding ${existingData.Sum_Of_Total_Outstanding} → ${entry.Sum_Of_Total_Outstanding} (${outstandingChange >= 0 ? '+' : ''}${outstandingChange}), DPD ${existingData.Max_of_DPD} → ${entry.Max_of_DPD} (${dpdChange >= 0 ? '+' : ''}${dpdChange})`);
//         }

//         if (entry.Status === 'Collected') {
//           collectedToday.push(entry.Customer_Name);
//           removedCustomers.push({
//             name: entry.Customer_Name,
//             contact: entry.Contact_No,
//             previousStatus: existingData.Status,
//             newStatus: 'Collected',
//             finalOutstanding: entry.Sum_Of_Total_Outstanding
//           });
//           console.log(`${entry.Customer_Name} marked as Collected - will be removed from future collections`);
//         }

//         // CRITICAL: Remove from map so it won't be carried forward separately
//         existingCustomersMap.delete(customerKey);
        
//       } else {
//         // NEW CUSTOMER - Not in previous collection
//         const newEntry = {
//           ...normalizedEntry,
//           _isNew: true,
//           _addedOn: uploadDate
//         };

//         finalEntries.push(newEntry);
//         newCustomers.push({
//           name: entry.Customer_Name,
//           contact: entry.Contact_No,
//           outstanding: entry.Sum_Of_Total_Outstanding,
//           dpd: entry.Max_of_DPD,
//           status: entry.Status
//         });

//         if (entry.Status === 'Collected') {
//           collectedToday.push(entry.Customer_Name);
//           console.log(`New customer ${entry.Customer_Name} added as Collected - won't carry forward`);
//         }
//       }
//     });

//     // Step 5: Carry forward ONLY customers NOT in today's upload AND still Pending/Partial
//     const continuingCustomers = [];
//     existingCustomersMap.forEach((existingEntry, customerKey) => {
//       // CRITICAL CHECK: Only carry forward if:
//       // 1. NOT in new upload (already checked by remaining in map)
//       // 2. Status is Pending or Partial
//       if (existingEntry.Status === 'Pending' || existingEntry.Status === 'Partial') {
//         finalEntries.push({
//           ...existingEntry,
//           Contact_No: isNaN(existingEntry.Contact_No) ? existingEntry.Contact_No : Number(existingEntry.Contact_No),
//           _continuing: true,
//           _noUpdateToday: true,
//           _carriedForwardFrom: existingEntry.lastDate
//         });

//         continuingCustomers.push({
//           name: existingEntry.Customer_Name,
//           contact: existingEntry.Contact_No,
//           status: existingEntry.Status,
//           outstanding: existingEntry.Sum_Of_Total_Outstanding,
//           dpd: existingEntry.Max_of_DPD,
//           note: 'Not in today\'s upload - carried forward with old data'
//         });
        
//         console.log(`Carrying forward ${existingEntry.Customer_Name} with status: ${existingEntry.Status} (Outstanding: ${existingEntry.Sum_Of_Total_Outstanding}, DPD: ${existingEntry.Max_of_DPD})`);
//       } else {
//         console.log(`Skipping carry-forward for ${existingEntry.Customer_Name} - Status: ${existingEntry.Status}`);
//       }
//     });

//     console.log(`Summary: ${newCustomers.length} new, ${updatedCustomers.length} updated (${amountUpdates.length} with amount changes), ${continuingCustomers.length} continuing, ${collectedToday.length} collected today, ${removedCustomers.length} removed`);

//     // Step 6: Save or update today's collection
//     let savedCollection;

//     if (existingTodayCollection) {
//       existingTodayCollection.Entries = finalEntries;
//       existingTodayCollection.Upload_Method = Upload_Method;
//       existingTodayCollection.Status = Status || 'Submitted';
//       existingTodayCollection.updatedAt = new Date();
//       savedCollection = await existingTodayCollection.save();
//       console.log('Updated existing collection for today');
//     } else {
//       const newCollection = new DPDCollection({
//         Employee_ID,
//         Employee_Name,
//         Date: uploadDate,
//         Upload_Method,
//         Entries: finalEntries,
//         Status: Status || 'Submitted'
//       });
//       savedCollection = await newCollection.save();
//       console.log('Created new collection for today');
//     }

//     // Step 7: Enhanced success response
//     res.status(201).json({
//       success: true,
//       message: 'DPD Collection saved successfully',
//       data: savedCollection,
//       summary: {
//         totalEntries: finalEntries.length,
//         uploadedCount: Entries.length,
//         newCustomers: newCustomers.length,
//         updatedCustomers: updatedCustomers.length,
//         continuingCustomers: continuingCustomers.length,
//         collectedToday: collectedToday.length,
//         removedFromFuture: removedCustomers.length,
//         amountUpdatesCount: amountUpdates.length,
//         details: {
//           new: newCustomers.slice(0, 5),
//           updated: updatedCustomers.slice(0, 5),
//           continuing: continuingCustomers.slice(0, 5),
//           collectedToday: collectedToday.slice(0, 5),
//           removed: removedCustomers.slice(0, 5),
//           amountUpdates: amountUpdates.slice(0, 5)
//         },
//         statusBreakdown: {
//           pending: finalEntries.filter(e => e.Status === 'Pending').length,
//           partial: finalEntries.filter(e => e.Status === 'Partial').length,
//           collected: finalEntries.filter(e => e.Status === 'Collected').length,
//           other: finalEntries.filter(e => !['Pending', 'Partial', 'Collected'].includes(e.Status)).length
//         },
//         financialSummary: {
//           totalOutstanding: finalEntries.reduce((sum, e) => sum + (e.Sum_Of_Total_Outstanding || 0), 0),
//           totalCollected: finalEntries.reduce((sum, e) => sum + (e.Collecting_Money || 0), 0),
//           averageDPD: finalEntries.length > 0 ? (finalEntries.reduce((sum, e) => sum + (e.Max_of_DPD || 0), 0) / finalEntries.length).toFixed(2) : 0
//         }
//       }
//     });

//   } catch (err) {
//     console.error('Error saving DPD collection:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to save DPD collection',
//       error: err.message
//     });
//   }
// };



// export const savedpdcollection = async (req, res, next) => {
//   try {
//     const { Employee_ID, Employee_Name, Date: dateString, Upload_Method, Entries, Status } = req.body;

//     // Validate required fields
//     if (!Employee_ID || !dateString || !Entries || Entries.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields: Employee_ID, Date, and Entries are required'
//       });
//     }

//     console.log(`Processing ${Entries.length} entries for employee ${Employee_Name} on ${dateString}`);

//     const uploadDate = new Date(dateString);
//     uploadDate.setHours(0, 0, 0, 0);

//     // Step 1: Check if collection for TODAY already exists
//     const existingTodayCollection = await DPDCollection.findOne({
//       Employee_ID: Employee_ID,
//       Date: uploadDate
//     });

//     // Step 2: Get the most recent collection BEFORE today
//     const latestPreviousCollection = await DPDCollection.findOne({
//       Employee_ID: Employee_ID,
//       Date: { $lt: uploadDate }
//     }).sort({ Date: -1 });

//     // HELPER FUNCTION: Extract Customer ID from name
//     const extractCustomerInfo = (customerName) => {
//       const trimmedName = customerName.trim();
      
//       // Check if name contains " - " followed by numbers
//       const match = trimmedName.match(/^(.+?)\s*-\s*(\d+)$/);
      
//       if (match) {
//         return {
//           fullName: trimmedName,           // "SUMAN FILLING STATION - 41032146"
//           baseName: match[1].trim(),       // "SUMAN FILLING STATION"
//           customerId: match[2].trim()      // "41032146"
//         };
//       }
      
//       // No ID in name
//       return {
//         fullName: trimmedName,
//         baseName: trimmedName,
//         customerId: null
//       };
//     };

//     // HELPER FUNCTION: Create unique customer key using name + customer ID
//     const createCustomerKey = (customerName, contactNo = null) => {
//       const { baseName, customerId } = extractCustomerInfo(customerName);
//       const normalizedBaseName = baseName.toLowerCase().trim();
      
//       // Primary identifier: baseName + customerId
//       if (customerId) {
//         return `${normalizedBaseName}_ID_${customerId}`;
//       }
      
//       // If no customer ID, fall back to name only
//       return `${normalizedBaseName}_NO_ID`;
//     };

//     // Step 3: Build map of existing ACTIVE customers from previous collection
//     const existingCustomersMap = new Map();
//     const existingCustomersByNameOnly = new Map();
    
//     if (latestPreviousCollection && latestPreviousCollection.Entries && Array.isArray(latestPreviousCollection.Entries)) {
//       latestPreviousCollection.Entries.forEach((entry, index) => {
//         // Only carry forward Pending and Partial status
//         if (entry.Status !== 'Pending' && entry.Status !== 'Partial') {
//           console.log(`Skipping ${entry.Customer_Name} - Status: ${entry.Status} (not Pending/Partial)`);
//           return;
//         }

//         const customerKey = createCustomerKey(entry.Customer_Name, entry.Contact_No);
//         const { baseName, customerId } = extractCustomerInfo(entry.Customer_Name);
//         const nameOnlyKey = baseName.toLowerCase().trim();
        
//         const customerData = {
//           ...entry,
//           Customer_ID: customerId || entry.Customer_ID, // Store extracted ID
//           originalIndex: index,
//           collectionId: latestPreviousCollection._id,
//           lastDate: latestPreviousCollection.Date
//         };
        
//         existingCustomersMap.set(customerKey, customerData);
        
//         // Also store by name only
//         if (!existingCustomersByNameOnly.has(nameOnlyKey)) {
//           existingCustomersByNameOnly.set(nameOnlyKey, []);
//         }
//         existingCustomersByNameOnly.get(nameOnlyKey).push(customerData);
//       });
//     }

//     console.log(`Found ${existingCustomersMap.size} active (Pending/Partial) customers from previous collections`);

//     // Step 4: Process incoming entries - GROUP BY CUSTOMER FIRST
//     const customerEntriesMap = new Map(); // Group all entries for same customer
    
//     Entries.forEach((entry, uploadIndex) => {
//       const { fullName, baseName, customerId } = extractCustomerInfo(entry.Customer_Name);
//       const customerKey = createCustomerKey(entry.Customer_Name);
      
//       if (!customerEntriesMap.has(customerKey)) {
//         customerEntriesMap.set(customerKey, []);
//       }
      
//       customerEntriesMap.get(customerKey).push({
//         ...entry,
//         _uploadIndex: uploadIndex,
//         _extractedId: customerId,
//         _baseName: baseName,
//         _fullName: fullName
//       });
//     });

//     console.log(`Grouped ${Entries.length} entries into ${customerEntriesMap.size} unique customers`);

//     // Step 5: Process each customer group (merge duplicates)
//     const finalEntries = [];
//     const newCustomers = [];
//     const updatedCustomers = [];
//     const collectedToday = [];
//     const removedCustomers = [];
//     const amountUpdates = [];
//     const mergedDuplicates = [];

//     customerEntriesMap.forEach((customerEntries, customerKey) => {
//       const firstEntry = customerEntries[0];
//       const { _baseName, _extractedId } = firstEntry;
      
//       console.log(`\n📦 Processing customer: ${_baseName} (ID: ${_extractedId || 'none'})`);
//       console.log(`   Found ${customerEntries.length} entries in upload`);

//       if (customerEntries.length > 1) {
//         mergedDuplicates.push({
//           customer: _baseName,
//           customerId: _extractedId,
//           duplicateCount: customerEntries.length,
//           entries: customerEntries.map(e => ({
//             outstanding: e.Sum_Of_Total_Outstanding,
//             dpd: e.Max_of_DPD,
//             contact: e.Contact_No,
//             status: e.Status
//           }))
//         });
//         console.log(`   ⚠️ DUPLICATES DETECTED - Will merge`);
//       }

//       // MERGE LOGIC: Combine all entries for this customer
//       let mergedEntry = { ...firstEntry };
//       let hasValidContact = false;

//       // Find the best contact number (first non-zero one)
//       for (let entry of customerEntries) {
//         if (entry.Contact_No && entry.Contact_No !== 0) {
//           mergedEntry.Contact_No = entry.Contact_No;
//           hasValidContact = true;
//           console.log(`   ✅ Using contact: ${entry.Contact_No}`);
//           break;
//         }
//       }

//       // Use the latest/most severe status (priority: Collected > Partial > Contacted > Pending)
//       const statusPriority = { 'Collected': 4, 'Partial': 3, 'Contacted': 2, 'Pending': 1 };
//       let highestStatus = firstEntry.Status;
//       let highestPriority = statusPriority[highestStatus] || 0;

//       customerEntries.forEach(entry => {
//         const priority = statusPriority[entry.Status] || 0;
//         if (priority > highestPriority) {
//           highestStatus = entry.Status;
//           highestPriority = priority;
//         }
//       });
//       mergedEntry.Status = highestStatus;

//       // Sum up Collecting_Money from all entries
//       mergedEntry.Collecting_Money = customerEntries.reduce((sum, e) => 
//         sum + (e.Collecting_Money || 0), 0);

//       // Use the highest outstanding amount
//       mergedEntry.Sum_Of_Total_Outstanding = Math.max(
//         ...customerEntries.map(e => e.Sum_Of_Total_Outstanding || 0)
//       );

//       // Use the highest DPD
//       mergedEntry.Max_of_DPD = Math.max(
//         ...customerEntries.map(e => e.Max_of_DPD || 0)
//       );

//       // Store customer ID
//       mergedEntry.Customer_ID = _extractedId;

//       // Normalize contact number
//       mergedEntry.Contact_No = (mergedEntry.Contact_No && mergedEntry.Contact_No !== 0) ? 
//         (isNaN(mergedEntry.Contact_No) ? mergedEntry.Contact_No : Number(mergedEntry.Contact_No)) : 0;

//       console.log(`   📊 Merged result: Outstanding=${mergedEntry.Sum_Of_Total_Outstanding}, DPD=${mergedEntry.Max_of_DPD}, Status=${mergedEntry.Status}, Contact=${mergedEntry.Contact_No}`);

//       // Check if customer exists in previous collection
//       let existingData = existingCustomersMap.get(customerKey);
      
//       // If not found by key, try to find by name only
//       if (!existingData) {
//         const nameOnlyKey = _baseName.toLowerCase().trim();
//         const matchingCustomers = existingCustomersByNameOnly.get(nameOnlyKey) || [];
        
//         for (let candidate of matchingCustomers) {
//           const { customerId: candidateId } = extractCustomerInfo(candidate.Customer_Name);
          
//           // Match if customer IDs match (or both don't have IDs)
//           if (_extractedId === candidateId) {
//             existingData = candidate;
//             const oldKey = createCustomerKey(candidate.Customer_Name);
//             existingCustomersMap.delete(oldKey);
//             console.log(`   🔍 Found match by name+ID in previous data`);
//             break;
//           }
//         }
//       }

//       if (existingData) {
//         // EXISTING CUSTOMER - UPDATE
//         const updatedEntry = {
//           ...mergedEntry,
//           _previousOutstanding: existingData.Sum_Of_Total_Outstanding,
//           _previousDPD: existingData.Max_of_DPD,
//           _previousCollected: existingData.Collecting_Money || 0,
//           _previousStatus: existingData.Status,
//           _lastUpdated: existingData.lastDate,
//           _isNew: false,
//           _addedOn: uploadDate,
//           // Preserve contact from old data if new data doesn't have it
//           Contact_No: mergedEntry.Contact_No || existingData.Contact_No || 0
//         };

//         finalEntries.push(updatedEntry);

//         const outstandingChange = mergedEntry.Sum_Of_Total_Outstanding - existingData.Sum_Of_Total_Outstanding;
//         const dpdChange = mergedEntry.Max_of_DPD - existingData.Max_of_DPD;

//         updatedCustomers.push({
//           name: _baseName,
//           customerId: _extractedId,
//           contact: updatedEntry.Contact_No,
//           oldOutstanding: existingData.Sum_Of_Total_Outstanding,
//           newOutstanding: mergedEntry.Sum_Of_Total_Outstanding,
//           outstandingChange: outstandingChange,
//           oldDPD: existingData.Max_of_DPD,
//           newDPD: mergedEntry.Max_of_DPD,
//           dpdChange: dpdChange,
//           status: mergedEntry.Status,
//           previousStatus: existingData.Status
//         });

//         if (outstandingChange !== 0 || dpdChange !== 0) {
//           amountUpdates.push({
//             name: _baseName,
//             customerId: _extractedId,
//             outstandingChange: outstandingChange,
//             dpdChange: dpdChange
//           });
//           console.log(`   💰 Outstanding: ${existingData.Sum_Of_Total_Outstanding} → ${mergedEntry.Sum_Of_Total_Outstanding} (${outstandingChange >= 0 ? '+' : ''}${outstandingChange})`);
//         }

//         if (mergedEntry.Status === 'Collected') {
//           collectedToday.push(_baseName);
//           removedCustomers.push({
//             name: _baseName,
//             customerId: _extractedId,
//             previousStatus: existingData.Status,
//             newStatus: 'Collected'
//           });
//           console.log(`   ✅ Marked as Collected - will be removed from future`);
//         }

//         // Remove from existing map
//         existingCustomersMap.delete(customerKey);
//       } else {
//         // NEW CUSTOMER
//         const newEntry = {
//           ...mergedEntry,
//           _isNew: true,
//           _addedOn: uploadDate
//         };

//         finalEntries.push(newEntry);

//         newCustomers.push({
//           name: _baseName,
//           customerId: _extractedId,
//           contact: newEntry.Contact_No,
//           outstanding: mergedEntry.Sum_Of_Total_Outstanding,
//           dpd: mergedEntry.Max_of_DPD,
//           status: mergedEntry.Status
//         });

//         console.log(`   ✨ NEW customer added`);

//         if (mergedEntry.Status === 'Collected') {
//           collectedToday.push(_baseName);
//         }
//       }
//     });

//     // Step 6: Carry forward customers not in today's upload
//     const continuingCustomers = [];
//     existingCustomersMap.forEach((existingEntry, customerKey) => {
//       if (existingEntry.Status === 'Pending' || existingEntry.Status === 'Partial') {
//         const { baseName, customerId } = extractCustomerInfo(existingEntry.Customer_Name);
        
//         finalEntries.push({
//           ...existingEntry,
//           Customer_ID: customerId || existingEntry.Customer_ID,
//           Contact_No: (existingEntry.Contact_No && existingEntry.Contact_No !== 0) ? 
//             (isNaN(existingEntry.Contact_No) ? existingEntry.Contact_No : Number(existingEntry.Contact_No)) : 0,
//           _continuing: true,
//           _noUpdateToday: true,
//           _carriedForwardFrom: existingEntry.lastDate
//         });

//         continuingCustomers.push({
//           name: baseName,
//           customerId: customerId,
//           status: existingEntry.Status,
//           outstanding: existingEntry.Sum_Of_Total_Outstanding,
//           dpd: existingEntry.Max_of_DPD
//         });

//         console.log(`📤 Carrying forward: ${baseName} (ID: ${customerId || 'none'})`);
//       }
//     });

//     console.log(`\n📊 SUMMARY: ${newCustomers.length} new, ${updatedCustomers.length} updated, ${continuingCustomers.length} continuing, ${collectedToday.length} collected, ${mergedDuplicates.length} duplicates merged`);

//     // Step 7: Save or update today's collection
//     let savedCollection;
//     if (existingTodayCollection) {
//       existingTodayCollection.Entries = finalEntries;
//       existingTodayCollection.Upload_Method = Upload_Method;
//       existingTodayCollection.Status = Status || 'Submitted';
//       existingTodayCollection.updatedAt = new Date();
//       savedCollection = await existingTodayCollection.save();
//       console.log('✅ Updated existing collection for today');
//     } else {
//       const newCollection = new DPDCollection({
//         Employee_ID,
//         Employee_Name,
//         Date: uploadDate,
//         Upload_Method,
//         Entries: finalEntries,
//         Status: Status || 'Submitted'
//       });
//       savedCollection = await newCollection.save();
//       console.log('✅ Created new collection for today');
//     }

//     // Step 8: Enhanced success response
//     res.status(201).json({
//       success: true,
//       message: 'DPD Collection saved successfully',
//       data: savedCollection,
//       summary: {
//         totalEntries: finalEntries.length,
//         uploadedCount: Entries.length,
//         newCustomers: newCustomers.length,
//         updatedCustomers: updatedCustomers.length,
//         continuingCustomers: continuingCustomers.length,
//         collectedToday: collectedToday.length,
//         removedFromFuture: removedCustomers.length,
//         amountUpdatesCount: amountUpdates.length,
//         duplicatesMerged: mergedDuplicates.length,
//         details: {
//           new: newCustomers.slice(0, 5),
//           updated: updatedCustomers.slice(0, 5),
//           continuing: continuingCustomers.slice(0, 5),
//           collectedToday: collectedToday.slice(0, 5),
//           removed: removedCustomers.slice(0, 5),
//           amountUpdates: amountUpdates.slice(0, 5),
//           merged: mergedDuplicates.slice(0, 5)
//         },
//         statusBreakdown: {
//           pending: finalEntries.filter(e => e.Status === 'Pending').length,
//           partial: finalEntries.filter(e => e.Status === 'Partial').length,
//           collected: finalEntries.filter(e => e.Status === 'Collected').length,
//           other: finalEntries.filter(e => !['Pending', 'Partial', 'Collected'].includes(e.Status)).length
//         },
//         financialSummary: {
//           totalOutstanding: finalEntries.reduce((sum, e) => sum + (e.Sum_Of_Total_Outstanding || 0), 0),
//           totalCollected: finalEntries.reduce((sum, e) => sum + (e.Collecting_Money || 0), 0),
//           averageDPD: finalEntries.length > 0 ?
//             (finalEntries.reduce((sum, e) => sum + (e.Max_of_DPD || 0), 0) / finalEntries.length).toFixed(2) : 0
//         }
//       }
//     });

//   } catch (err) {
//     console.error('Error saving DPD collection:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to save DPD collection',
//       error: err.message
//     });
//   }
// };



export const savedpdcollection = async (req, res, next) => {
  try {
    const { Employee_ID, Employee_Name, Date: dateString, Upload_Method, Entries, Status } = req.body;

    // Validate required fields
    if (!Employee_ID || !dateString || !Entries || Entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: Employee_ID, Date, and Entries are required'
      });
    }

    console.log(`Processing ${Entries.length} entries for employee ${Employee_Name} on ${dateString}`);

    const uploadDate = new Date(dateString);
    uploadDate.setHours(0, 0, 0, 0);

    // Step 1: Check if collection for TODAY already exists
    const existingTodayCollection = await DPDCollection.findOne({
      Employee_ID: Employee_ID,
      Date: uploadDate
    });

    // Step 2: Get the most recent collection BEFORE today
    const latestPreviousCollection = await DPDCollection.findOne({
      Employee_ID: Employee_ID,
      Date: { $lt: uploadDate }
    }).sort({ Date: -1 });

    // HELPER FUNCTION: Extract Customer ID from name
    const extractCustomerInfo = (customerName) => {
      const trimmedName = customerName.trim();
      
      // Check if name contains " - " followed by numbers
      const match = trimmedName.match(/^(.+?)\s*-\s*(\d+)$/);
      
      if (match) {
        return {
          fullName: trimmedName,           // "SUMAN FILLING STATION - 41032146"
          baseName: match[1].trim(),       // "SUMAN FILLING STATION"
          customerId: match[2].trim()      // "41032146"
        };
      }
      
      // No ID in name
      return {
        fullName: trimmedName,
        baseName: trimmedName,
        customerId: null
      };
    };

    // HELPER FUNCTION: Create unique customer key using name + customer ID
    const createCustomerKey = (customerName, contactNo = null) => {
      const { baseName, customerId } = extractCustomerInfo(customerName);
      const normalizedBaseName = baseName.toLowerCase().trim();
      
      // Primary identifier: baseName + customerId
      if (customerId) {
        return `${normalizedBaseName}_ID_${customerId}`;
      }
      
      // If no customer ID, fall back to name only
      return `${normalizedBaseName}_NO_ID`;
    };

    // Step 3: Build map of existing ACTIVE customers from previous collection
    const existingCustomersMap = new Map();
    const existingCustomersByNameOnly = new Map();
    
    if (latestPreviousCollection && latestPreviousCollection.Entries && Array.isArray(latestPreviousCollection.Entries)) {
      latestPreviousCollection.Entries.forEach((entry, index) => {
        // Only carry forward Pending and Partial status
        if (entry.Status !== 'Pending' && entry.Status !== 'Partial') {
          console.log(`Skipping ${entry.Customer_Name} - Status: ${entry.Status} (not Pending/Partial)`);
          return;
        }

        const customerKey = createCustomerKey(entry.Customer_Name, entry.Contact_No);
        const { baseName, customerId } = extractCustomerInfo(entry.Customer_Name);
        const nameOnlyKey = baseName.toLowerCase().trim();
        
        const customerData = {
          ...entry,
          Customer_ID: customerId || entry.Customer_ID, // Store extracted ID
          originalIndex: index,
          collectionId: latestPreviousCollection._id,
          lastDate: latestPreviousCollection.Date
        };
        
        existingCustomersMap.set(customerKey, customerData);
        
        // Also store by name only
        if (!existingCustomersByNameOnly.has(nameOnlyKey)) {
          existingCustomersByNameOnly.set(nameOnlyKey, []);
        }
        existingCustomersByNameOnly.get(nameOnlyKey).push(customerData);
      });
    }

    console.log(`Found ${existingCustomersMap.size} active (Pending/Partial) customers from previous collections`);

    // Step 4: Process incoming entries - GROUP BY CUSTOMER FIRST
    const customerEntriesMap = new Map(); // Group all entries for same customer
    
    Entries.forEach((entry, uploadIndex) => {
      const { fullName, baseName, customerId } = extractCustomerInfo(entry.Customer_Name);
      const customerKey = createCustomerKey(entry.Customer_Name);
      
      if (!customerEntriesMap.has(customerKey)) {
        customerEntriesMap.set(customerKey, []);
      }
      
      customerEntriesMap.get(customerKey).push({
        ...entry,
        _uploadIndex: uploadIndex,
        _extractedId: customerId,
        _baseName: baseName,
        _fullName: fullName
      });
    });

    console.log(`Grouped ${Entries.length} entries into ${customerEntriesMap.size} unique customers`);

    // Step 5: Process each customer group (merge duplicates)
    const finalEntries = [];
    const newCustomers = [];
    const updatedCustomers = [];
    const collectedToday = [];
    const removedCustomers = [];
    const amountUpdates = [];
    const mergedDuplicates = [];

    customerEntriesMap.forEach((customerEntries, customerKey) => {
      const firstEntry = customerEntries[0];
      const { _baseName, _extractedId } = firstEntry;
      
      console.log(`\n📦 Processing customer: ${_baseName} (ID: ${_extractedId || 'none'})`);
      console.log(`   Found ${customerEntries.length} entries in upload`);

      if (customerEntries.length > 1) {
        mergedDuplicates.push({
          customer: _baseName,
          customerId: _extractedId,
          duplicateCount: customerEntries.length,
          entries: customerEntries.map(e => ({
            outstanding: e.Sum_Of_Total_Outstanding,
            dpd: e.Max_of_DPD,
            contact: e.Contact_No,
            status: e.Status
          }))
        });
        console.log(`   ⚠️ DUPLICATES DETECTED - Will merge`);
      }

      // MERGE LOGIC: Combine all entries for this customer
      let mergedEntry = { ...firstEntry };
      let hasValidContact = false;

      // Find the best contact number (first non-zero one)
      for (let entry of customerEntries) {
        if (entry.Contact_No && entry.Contact_No !== 0) {
          mergedEntry.Contact_No = entry.Contact_No;
          hasValidContact = true;
          console.log(`   ✅ Using contact: ${entry.Contact_No}`);
          break;
        }
      }

      // Use the latest/most severe status (priority: Collected > Partial > Contacted > Pending)
      const statusPriority = { 'Collected': 4, 'Partial': 3, 'Contacted': 2, 'Pending': 1 };
      let highestStatus = firstEntry.Status;
      let highestPriority = statusPriority[highestStatus] || 0;

      customerEntries.forEach(entry => {
        const priority = statusPriority[entry.Status] || 0;
        if (priority > highestPriority) {
          highestStatus = entry.Status;
          highestPriority = priority;
        }
      });
      mergedEntry.Status = highestStatus;

      // Sum up Collecting_Money from all entries
      mergedEntry.Collecting_Money = customerEntries.reduce((sum, e) => 
        sum + (e.Collecting_Money || 0), 0);

      // Use the highest outstanding amount
      mergedEntry.Sum_Of_Total_Outstanding = Math.max(
        ...customerEntries.map(e => e.Sum_Of_Total_Outstanding || 0)
      );

      // Use the highest DPD
      mergedEntry.Max_of_DPD = Math.max(
        ...customerEntries.map(e => e.Max_of_DPD || 0)
      );

      // Store customer ID
      mergedEntry.Customer_ID = _extractedId;

      // Normalize contact number
      mergedEntry.Contact_No = (mergedEntry.Contact_No && mergedEntry.Contact_No !== 0) ? 
        (isNaN(mergedEntry.Contact_No) ? mergedEntry.Contact_No : Number(mergedEntry.Contact_No)) : 0;

      console.log(`   📊 Merged result: Outstanding=${mergedEntry.Sum_Of_Total_Outstanding}, DPD=${mergedEntry.Max_of_DPD}, Status=${mergedEntry.Status}, Contact=${mergedEntry.Contact_No}`);

      // Check if customer exists in previous collection
      let existingData = existingCustomersMap.get(customerKey);
      
      // If not found by key, try to find by name only
      if (!existingData) {
        const nameOnlyKey = _baseName.toLowerCase().trim();
        const matchingCustomers = existingCustomersByNameOnly.get(nameOnlyKey) || [];
        
        for (let candidate of matchingCustomers) {
          const { customerId: candidateId } = extractCustomerInfo(candidate.Customer_Name);
          
          // Match if customer IDs match (or both don't have IDs)
          if (_extractedId === candidateId) {
            existingData = candidate;
            const oldKey = createCustomerKey(candidate.Customer_Name);
            existingCustomersMap.delete(oldKey);
            console.log(`   🔍 Found match by name+ID in previous data`);
            break;
          }
        }
      }

      if (existingData) {
        // EXISTING CUSTOMER - UPDATE
        const updatedEntry = {
          ...mergedEntry,
          _previousOutstanding: existingData.Sum_Of_Total_Outstanding,
          _previousDPD: existingData.Max_of_DPD,
          _previousCollected: existingData.Collecting_Money || 0,
          _previousStatus: existingData.Status,
          _lastUpdated: existingData.lastDate,
          _isNew: false,
          _addedOn: uploadDate,
          // Preserve contact from old data if new data doesn't have it
          Contact_No: mergedEntry.Contact_No || existingData.Contact_No || 0
        };

        finalEntries.push(updatedEntry);

        const outstandingChange = mergedEntry.Sum_Of_Total_Outstanding - existingData.Sum_Of_Total_Outstanding;
        const dpdChange = mergedEntry.Max_of_DPD - existingData.Max_of_DPD;

        updatedCustomers.push({
          name: _baseName,
          customerId: _extractedId,
          contact: updatedEntry.Contact_No,
          oldOutstanding: existingData.Sum_Of_Total_Outstanding,
          newOutstanding: mergedEntry.Sum_Of_Total_Outstanding,
          outstandingChange: outstandingChange,
          oldDPD: existingData.Max_of_DPD,
          newDPD: mergedEntry.Max_of_DPD,
          dpdChange: dpdChange,
          status: mergedEntry.Status,
          previousStatus: existingData.Status
        });

        if (outstandingChange !== 0 || dpdChange !== 0) {
          amountUpdates.push({
            name: _baseName,
            customerId: _extractedId,
            outstandingChange: outstandingChange,
            dpdChange: dpdChange
          });
          console.log(`   💰 Outstanding: ${existingData.Sum_Of_Total_Outstanding} → ${mergedEntry.Sum_Of_Total_Outstanding} (${outstandingChange >= 0 ? '+' : ''}${outstandingChange})`);
        }

        if (mergedEntry.Status === 'Collected') {
          collectedToday.push(_baseName);
          removedCustomers.push({
            name: _baseName,
            customerId: _extractedId,
            previousStatus: existingData.Status,
            newStatus: 'Collected'
          });
          console.log(`   ✅ Marked as Collected - will be removed from future`);
        }

        // Remove from existing map
        existingCustomersMap.delete(customerKey);
      } else {
        // NEW CUSTOMER
        const newEntry = {
          ...mergedEntry,
          _isNew: true,
          _addedOn: uploadDate
        };

        finalEntries.push(newEntry);

        newCustomers.push({
          name: _baseName,
          customerId: _extractedId,
          contact: newEntry.Contact_No,
          outstanding: mergedEntry.Sum_Of_Total_Outstanding,
          dpd: mergedEntry.Max_of_DPD,
          status: mergedEntry.Status
        });

        console.log(`   ✨ NEW customer added`);

        if (mergedEntry.Status === 'Collected') {
          collectedToday.push(_baseName);
        }
      }
    });

    // Step 6: Carry forward customers not in today's upload
    const continuingCustomers = [];
    existingCustomersMap.forEach((existingEntry, customerKey) => {
      if (existingEntry.Status === 'Pending' || existingEntry.Status === 'Partial') {
        const { baseName, customerId } = extractCustomerInfo(existingEntry.Customer_Name);
        
        // ✨ Calculate days since last update
        const daysSinceLastUpdate = Math.floor(
          (uploadDate - new Date(existingEntry.lastDate)) / (1000 * 60 * 60 * 24)
        );
        
        // ✨ Auto-increment DPD for carried forward entries
        const updatedDPD = existingEntry.Max_of_DPD + daysSinceLastUpdate;
        
        // ✨ Optional: Add interest/penalty to outstanding (adjust rate as needed)
        // Set dailyInterestRate = 0 if you don't want automatic interest calculation
        const dailyInterestRate = 0.00; // 0% = no auto-interest (change to 0.01 for 1% daily)
        const interestAmount = existingEntry.Sum_Of_Total_Outstanding * dailyInterestRate * daysSinceLastUpdate;
        const updatedOutstanding = existingEntry.Sum_Of_Total_Outstanding + interestAmount;
        
        finalEntries.push({
          ...existingEntry,
          Customer_ID: customerId || existingEntry.Customer_ID,
          Contact_No: (existingEntry.Contact_No && existingEntry.Contact_No !== 0) ? 
            (isNaN(existingEntry.Contact_No) ? existingEntry.Contact_No : Number(existingEntry.Contact_No)) : 0,
          
          // ✨ UPDATED VALUES: Auto-incremented DPD and Outstanding
          Max_of_DPD: updatedDPD,  // DPD increases by days elapsed
          Sum_Of_Total_Outstanding: updatedOutstanding,  // Outstanding + interest (if enabled)
          
          // Tracking fields
          _continuing: true,
          _noUpdateToday: true,
          _carriedForwardFrom: existingEntry.lastDate,
          _autoIncrementedDPD: daysSinceLastUpdate,
          _addedInterest: interestAmount,
          _originalOutstanding: existingEntry.Sum_Of_Total_Outstanding,
          _originalDPD: existingEntry.Max_of_DPD
        });

        continuingCustomers.push({
          name: baseName,
          customerId: customerId,
          status: existingEntry.Status,
          oldOutstanding: existingEntry.Sum_Of_Total_Outstanding,
          newOutstanding: updatedOutstanding,
          outstandingChange: interestAmount,
          oldDPD: existingEntry.Max_of_DPD,
          newDPD: updatedDPD,
          dpdIncrement: daysSinceLastUpdate,
          daysMissed: daysSinceLastUpdate
        });

        if (daysSinceLastUpdate > 0) {
          console.log(`📤 Carrying forward: ${baseName} (ID: ${customerId || 'none'})`);
          console.log(`   📈 Auto-incremented: DPD ${existingEntry.Max_of_DPD} → ${updatedDPD} (+${daysSinceLastUpdate} days)`);
          if (interestAmount > 0) {
            console.log(`   💰 Interest added: ₹${interestAmount.toFixed(2)} (Outstanding: ${existingEntry.Sum_Of_Total_Outstanding.toFixed(2)} → ${updatedOutstanding.toFixed(2)})`);
          }
        } else {
          console.log(`📤 Carrying forward: ${baseName} (ID: ${customerId || 'none'}) - Same day, no increment`);
        }
      }
    });

    console.log(`\n📊 SUMMARY: ${newCustomers.length} new, ${updatedCustomers.length} updated, ${continuingCustomers.length} continuing, ${collectedToday.length} collected, ${mergedDuplicates.length} duplicates merged`);

    // Step 7: Save or update today's collection
    let savedCollection;
    if (existingTodayCollection) {
      existingTodayCollection.Entries = finalEntries;
      existingTodayCollection.Upload_Method = Upload_Method;
      existingTodayCollection.Status = Status || 'Submitted';
      existingTodayCollection.updatedAt = new Date();
      savedCollection = await existingTodayCollection.save();
      console.log('✅ Updated existing collection for today');
    } else {
      const newCollection = new DPDCollection({
        Employee_ID,
        Employee_Name,
        Date: uploadDate,
        Upload_Method,
        Entries: finalEntries,
        Status: Status || 'Submitted'
      });
      savedCollection = await newCollection.save();
      console.log('✅ Created new collection for today');
    }

    // Step 8: Enhanced success response
    res.status(201).json({
      success: true,
      message: 'DPD Collection saved successfully',
      data: savedCollection,
      summary: {
        totalEntries: finalEntries.length,
        uploadedCount: Entries.length,
        newCustomers: newCustomers.length,
        updatedCustomers: updatedCustomers.length,
        continuingCustomers: continuingCustomers.length,
        collectedToday: collectedToday.length,
        removedFromFuture: removedCustomers.length,
        amountUpdatesCount: amountUpdates.length,
        duplicatesMerged: mergedDuplicates.length,
        details: {
          new: newCustomers.slice(0, 5),
          updated: updatedCustomers.slice(0, 5),
          continuing: continuingCustomers.slice(0, 5),
          collectedToday: collectedToday.slice(0, 5),
          removed: removedCustomers.slice(0, 5),
          amountUpdates: amountUpdates.slice(0, 5),
          merged: mergedDuplicates.slice(0, 5)
        },
        statusBreakdown: {
          pending: finalEntries.filter(e => e.Status === 'Pending').length,
          partial: finalEntries.filter(e => e.Status === 'Partial').length,
          collected: finalEntries.filter(e => e.Status === 'Collected').length,
          other: finalEntries.filter(e => !['Pending', 'Partial', 'Collected'].includes(e.Status)).length
        },
        financialSummary: {
          totalOutstanding: finalEntries.reduce((sum, e) => sum + (e.Sum_Of_Total_Outstanding || 0), 0),
          totalCollected: finalEntries.reduce((sum, e) => sum + (e.Collecting_Money || 0), 0),
          averageDPD: finalEntries.length > 0 ?
            (finalEntries.reduce((sum, e) => sum + (e.Max_of_DPD || 0), 0) / finalEntries.length).toFixed(2) : 0
        }
      }
    });

  } catch (err) {
    console.error('Error saving DPD collection:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to save DPD collection',
      error: err.message
    });
  }
};

// EXAMPLE SCENARIO:
// 
// DAY 1 (Jan 1):
// - Customer A: Outstanding = 10,000, DPD = 10, Status = Pending
// - Customer B: Outstanding = 5,000, DPD = 5, Status = Pending
//
// DAY 2 (Jan 2) - NEW UPLOAD FILE:
// - Customer A: Outstanding = 10,500, DPD = 11, Status = Partial  
//   → OVERRIDDEN with new amounts (interest added, DPD increased)
// - Customer C: Outstanding = 3,000, DPD = 2, Status = Pending
//   → NEW customer added
// - Customer B: NOT in upload
//   → CARRIED FORWARD with OLD data (Outstanding = 5,000, DPD = 5)
//
// Result in DB for Day 2:
// - Customer A: 10,500 outstanding, DPD 11, Partial (NEW data)
// - Customer B: 5,000 outstanding, DPD 5, Pending (OLD data carried forward)
// - Customer C: 3,000 outstanding, DPD 2, Pending (NEW customer)
//
// DAY 3 (Jan 3) - NEW UPLOAD FILE:
// - Customer A: Outstanding = 0, DPD = 0, Status = Collected
//   → Marked as collected, won't appear on Day 4
// - Customer B: Outstanding = 5,200, DPD = 7, Status = Pending
//   → OVERRIDDEN with new amounts
// - Customer D: Outstanding = 8,000, DPD = 15, Status = Pending
//   → NEW customer
//
// Result in DB for Day 3:
// - Customer A: 0 outstanding, Collected (won't carry to Day 4)
// - Customer B: 5,200 outstanding, DPD 7, Pending (NEW data)
// - Customer C: NOT in upload, carried forward (3,000, DPD 2)
// - Customer D: 8,000 outstanding, DPD 15, Pending (NEW customer)
//
// DAY 4: Only B, C, D will appear (A is Collected, so excluded)



export const getalldpdcollections = async (req, res, next) => {
  try {
    const { first, rows , globalfilter = '' } = req.query;
    
    // Get user info from token
    const userRole = req.user?.Role;
    const userId = req.user?.id;

    // Build search query
    const searchQuery = globalfilter 
      ? { 
          $or: [
            { Employee_Name: { $regex: globalfilter, $options: 'i' } },
            { 'Entries.Customer_Name': { $regex: globalfilter, $options: 'i' } },
            { 'Entries.City': { $regex: globalfilter, $options: 'i' } },
            { 'Entries.State': { $regex: globalfilter, $options: 'i' } }
          ]
        }
      : {};
    
    // Build base filter
    let filter = { ...searchQuery };
    
    // If user is Sales_Man, only show their own DPD collections
    if (userRole === 'Sales_Man') {
      filter = {
        ...filter,
        Employee_ID: userId
      };
    }
    // If Admin, show all DPD collections (no additional filter needed)
    
    console.log('Filter applied:', JSON.stringify(filter));
    console.log('User Role:', userRole);
    console.log('User ID:', userId);

    const totallength = await DPDCollection.countDocuments(filter);
    const resdata = await DPDCollection.find({
  ...filter,
  Status: 'Active'
})
      .populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email')
      .sort({ createdAt: -1 })
      .skip(parseInt(first))
      .limit(parseInt(rows));

    res.send({
      success: true,
      resdata,
      totallength,
      userRole // Send role to frontend for conditional rendering
    });
  } catch (err) {
    console.error('Error fetching DPD collections:', err);
    res.send({
      success: false,
      message: 'Failed to fetch DPD collections',
      error: err.message
    });
  }
};




// Get today's date range (start and end of day)
const getDateRange = (dateString) => {
  const date = new Date(dateString);
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  return { startOfDay, endOfDay };
};

// Get today's date range (start and end of day)
const getTodayRange = () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  return { startOfDay, endOfDay };
};


export const getAdminDpdCollections = async (req, res, next) => {
  try {
    const { first, rows, globalfilter = '', selectedDate } = req.query;
    
    // Get user info from token
    const userRole = req.user?.Role;
    
    // Only allow admins to access this endpoint
    if (userRole === 'Sales_Man') {
      return res.status(403).send({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Get date range - either selected date or today
    let startOfDay, endOfDay;
    if (selectedDate) {
      const range = getDateRange(selectedDate);
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
    } else {
      const range = getTodayRange();
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
    }

    // Fetch all DPD collections for the selected date
    const dateCollections = await DPDCollection.find({
      Date: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email Role')
      .sort({ createdAt: -1 });

    // Create a map of collections by employee ID for quick lookup
    const collectionsByEmployee = {};
    
    dateCollections.forEach(collection => {
      const employeeId = collection.Employee_ID?._id?.toString() || collection.Employee_ID?.toString();
      
      if (!collectionsByEmployee[employeeId]) {
        collectionsByEmployee[employeeId] = {
          employeeId: employeeId,
          employeeName: collection.Employee_Name || 
                       (collection.Employee_ID?.First_Name && collection.Employee_ID?.Last_Name 
                         ? `${collection.Employee_ID.First_Name} ${collection.Employee_ID.Last_Name}`
                         : 'Unknown'),
          employeeEmail: collection.Employee_ID?.Email || '',
          employeeData: collection.Employee_ID,
          collections: []
        };
      }
      
      collectionsByEmployee[employeeId].collections.push(collection);
    });

    // Build employee search filter (for Sales_Man role only)
    let employeeFilter = { Role: 'Sales_Man' };
    
    if (globalfilter) {
      const searchRegex = { $regex: globalfilter, $options: 'i' };
      employeeFilter.$or = [
        { First_Name: searchRegex },
        { Last_Name: searchRegex },
        { Email: searchRegex },
        { Employee_ID: searchRegex }
      ];
    }

    // Get all salesmen matching the search
    const allSalesmen = await Employee.find({...employeeFilter, Status: 'Active'})
      .select('Image First_Name Last_Name Employee_ID Email Role')
      .sort({ First_Name: 1 });

    // Combine employees with their DPD collections (or without)
    let combinedData = allSalesmen.map(emp => {
      const employeeId = emp._id.toString();
      const employeeCollections = collectionsByEmployee[employeeId];

      if (employeeCollections) {
        // Employee has collections for this date
        return employeeCollections;
      } else {
        // Employee has no collections for this date
        return {
          employeeId: employeeId,
          employeeName: `${emp.First_Name || ''} ${emp.Last_Name || ''}`.trim(),
          employeeEmail: emp.Email || '',
          employeeData: emp,
          collections: [] // Empty array indicates no DPD data for this date
        };
      }
    });

    // Calculate total length
    const totallength = combinedData.length;
    
    // Apply pagination
    const skip = parseInt(first) || 0;
    const limit = parseInt(rows) || 10;
    const paginatedEmployees = combinedData.slice(skip, skip + limit);

    res.send({
      success: true,
      resdata: paginatedEmployees,
      totallength,
      userRole,
      filterDate: startOfDay.toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Error fetching admin DPD collections:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch DPD collections',
      error: err.message
    });
  }
};



// export const getSalespersonDpdCollections = async (req, res, next) => {
//   try {
//     const { first = '0', rows = '10', globalfilter = '', selectedDate, showCarriedForward = 'true' } = req.query;
//     const userRole = req.user?.Role;
//     const userId = req.user?.id;

//     // Restrict access to Sales_Man only
//     if (userRole !== 'Sales_Man') {
//       return res.status(403).send({ 
//         success: false,
//         message: 'Access denied. Salesperson only.'
//       });
//     }

//     // Determine date range: use selectedDate if provided, otherwise today
//     let startOfDay, endOfDay;
//     let usedFilterDate;

//     if (selectedDate) {
//       const range = getDateRange(selectedDate);
//       startOfDay = range.startOfDay;
//       endOfDay = range.endOfDay;
//       usedFilterDate = selectedDate;
//     } else {
//       const range = getTodayRange();
//       startOfDay = range.startOfDay;
//       endOfDay = range.endOfDay;
//       usedFilterDate = startOfDay.toISOString().split('T')[0];
//     }

//     // Build filter - ALWAYS filter by date
//     const filter = { 
//       Employee_ID: userId,
//       Date: { $gte: startOfDay, $lte: endOfDay }
//     };

//     // Fetch collections for the selected date
//     const collections = await DPDCollection.find(filter)
//       .populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email')
//       .sort({ createdAt: -1 })
//       .lean();

//     // Flatten all entries across collections
//     let flattenedEntries = [];

//     collections.forEach(collection => {
//       if (collection.Entries && Array.isArray(collection.Entries)) {
//         collection.Entries.forEach((entry, entryIndex) => {
//           flattenedEntries.push({
//             ...entry,
//             collectionId: collection._id,
//             collectionDate: collection.Date,
//             uploadMethod: collection.Upload_Method,
//             entryIndex: entryIndex,
//             employeeName: collection.Employee_Name || 
//                          `${collection.Employee_ID?.First_Name || ''} ${collection.Employee_ID?.Last_Name || ''}`.trim()
//           });
//         });
//       }
//     });

//     // OPTIONAL: Filter out carried forward entries if requested
//     if (showCarriedForward === 'false') {
//       flattenedEntries = flattenedEntries.filter(entry => !entry._continuing && !entry._noUpdateToday);
//     }

//     // Apply global search filter AFTER fetching by date
//     if (globalfilter && globalfilter.trim() !== '') {
//       const searchLower = globalfilter.toLowerCase().trim();
//       flattenedEntries = flattenedEntries.filter(entry => 
//         (entry.Customer_Name && entry.Customer_Name.toLowerCase().includes(searchLower)) ||
//         (entry.City && entry.City.toLowerCase().includes(searchLower)) ||
//         (entry.State && entry.State.toLowerCase().includes(searchLower)) ||
//         (entry.Contact_No && String(entry.Contact_No).includes(searchLower)) ||
//         (entry.Status && entry.Status.toLowerCase().includes(searchLower)) ||
//         (entry.Remarks && entry.Remarks.toLowerCase().includes(searchLower))
//       );
//     }

//     // Pagination
//     const totallength = flattenedEntries.length;
//     const skip = parseInt(first) || 0;
//     const limit = parseInt(rows) || 10;
//     const paginatedEntries = flattenedEntries.slice(skip, skip + limit);

//     // Send response
//     res.send({
//       success: true,
//       resdata: paginatedEntries,
//       totallength,
//       userRole,
//       filterDate: usedFilterDate
//     });

//   } catch (err) {
//     console.error('Error fetching salesperson DPD collections:', err);
//     res.status(500).send({
//       success: false,
//       message: 'Failed to fetch DPD collections',
//       error: err.message
//     });
//   }
// };


export const getSalespersonDpdCollections = async (req, res, next) => {
  try {
    const { 
      first = '0', 
      rows = '10', 
      globalfilter = '', 
      selectedDate, 
      showCarriedForward = 'true' 
    } = req.query;
    
    const userRole = req.user?.Role;
    const userId = req.user?.id;

    // Restrict access to Sales_Man only
    if (userRole !== 'Sales_Man') {
      return res.status(403).send({
        success: false,
        message: 'Access denied. Salesperson only.'
      });
    }

    // Determine date range: use selectedDate if provided, otherwise today
    let startOfDay, endOfDay;
    let usedFilterDate;
    
    if (selectedDate) {
      const range = getDateRange(selectedDate);
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
      usedFilterDate = selectedDate;
    } else {
      const range = getTodayRange();
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
      usedFilterDate = startOfDay.toISOString().split('T')[0];
    }

    // Build filter - ALWAYS filter by date
    const filter = {
      Employee_ID: userId,
      Date: { $gte: startOfDay, $lte: endOfDay }
    };

    // Fetch collections for the selected date
    const collections = await DPDCollection.find(filter)
      .populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email')
      .sort({ createdAt: -1 })
      .lean();

    // Flatten all entries across collections
    let flattenedEntries = [];
    collections.forEach(collection => {
      if (collection.Entries && Array.isArray(collection.Entries)) {
        collection.Entries.forEach((entry, entryIndex) => {
          flattenedEntries.push({
            ...entry,
            collectionId: collection._id,
            collectionDate: collection.Date,
            uploadMethod: collection.Upload_Method,
            entryIndex: entryIndex,
            employeeName: collection.Employee_Name || 
              `${collection.Employee_ID?.First_Name || ''} ${collection.Employee_ID?.Last_Name || ''}`.trim()
          });
        });
      }
    });

    // OPTIONAL: Filter out carried forward entries if requested
    if (showCarriedForward === 'false') {
      flattenedEntries = flattenedEntries.filter(entry => 
        !entry._continuing && !entry._noUpdateToday
      );
    }

    // Store the full unfiltered data for summary calculations
    const allEntriesForSummary = [...flattenedEntries];

    // Apply global search filter AFTER fetching by date
    if (globalfilter && globalfilter.trim() !== '') {
      const searchLower = globalfilter.toLowerCase().trim();
      flattenedEntries = flattenedEntries.filter(entry =>
        (entry.Customer_Name && entry.Customer_Name.toLowerCase().includes(searchLower)) ||
        (entry.City && entry.City.toLowerCase().includes(searchLower)) ||
        (entry.State && entry.State.toLowerCase().includes(searchLower)) ||
        (entry.Contact_No && String(entry.Contact_No).includes(searchLower)) ||
        (entry.Status && entry.Status.toLowerCase().includes(searchLower)) ||
        (entry.Remarks && entry.Remarks.toLowerCase().includes(searchLower))
      );
    }

    // Calculate summary statistics from ALL entries (before pagination)
    const summaryStats = {
      totalOutstanding: allEntriesForSummary.reduce((sum, entry) => 
        sum + (entry.Sum_Of_Total_Outstanding || 0), 0
      ),
      totalCollected: allEntriesForSummary.reduce((sum, entry) => 
        sum + (entry.Collecting_Money || 0), 0
      ),
      totalCustomers: allEntriesForSummary.length,
      collectedCount: allEntriesForSummary.filter(entry => 
        entry.Status === 'Collected'
      ).length,
      partialCount: allEntriesForSummary.filter(entry => 
        entry.Status === 'Partial'
      ).length,
      pendingCount: allEntriesForSummary.filter(entry => 
        entry.Status === 'Pending'
      ).length,
      avgDPD: allEntriesForSummary.length > 0 
        ? (allEntriesForSummary.reduce((sum, entry) => 
            sum + (entry.Max_of_DPD || 0), 0
          ) / allEntriesForSummary.length).toFixed(1)
        : 0
    };

    // Add derived fields
    summaryStats.remainingOutstanding = summaryStats.totalOutstanding - summaryStats.totalCollected;
    summaryStats.collectionRate = summaryStats.totalCustomers > 0 
      ? ((summaryStats.collectedCount + summaryStats.partialCount) / summaryStats.totalCustomers * 100).toFixed(1)
      : 0;

    // Pagination for table data
    const totallength = flattenedEntries.length;
    const skip = parseInt(first) || 0;
    const limit = parseInt(rows) || 10;
    const paginatedEntries = flattenedEntries.slice(skip, skip + limit);

    // Send response with both paginated data and summary
    res.send({
      success: true,
      resdata: paginatedEntries,
      totallength,
      userRole,
      filterDate: usedFilterDate,
      summary: summaryStats  // Add summary statistics
    });

  } catch (err) {
    console.error('Error fetching salesperson DPD collections:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch DPD collections',
      error: err.message
    });
  }
};


export const getEmployeeDpdDetails = async (req, res, next) => {
  try {
    const { employeeId , } = req.params;
    const { selectedDate } = req.query; // Get selected date from query params
    
    // Verify admin access
    const userRole = req.user?.Role;
    if (userRole !== 'Admin' && userRole !== 'Manager') {
      return res.status(403).send({success: false,message: 'Unauthorized access'});
    }

    // Fetch employee details
    const employee = await Employee.findById(employeeId).select('First_Name Last_Name Employee_ID Email Phone');
    
    if (!employee) {
      return res.status(404).send({success: false,message: 'Employee not found'});
    }

    // Get date range - either selected date or today
    let startOfDay, endOfDay;
    if (selectedDate) {
      const range = getDateRange(selectedDate);
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
    } else {
      const range = getTodayRange();
      startOfDay = range.startOfDay;
      endOfDay = range.endOfDay;
    }

    // Fetch collections for this employee - for selected date
    const collections = await DPDCollection.find({ Employee_ID: employeeId,Date: { $gte: startOfDay, $lte: endOfDay }}) .sort({ createdAt: -1 }) .populate('Employee_ID', 'First_Name Last_Name Employee_ID Email');
    // Calculate statistics (same as before)
    let totalDPDCount = 0;
    let pendingCount = 0;
    let collectedCount = 0;
    let contactedCount = 0;
    let failedCount = 0;
    let totalOutstanding = 0;
    let totalCollected = 0;
    let totalCommitted = 0;
    const dpdRanges = { '0-15': 0, '16-30': 0, '31-60': 0, '60+': 0 };
    const statusCounts = { Collected: 0, Pending: 0, Contacted: 0, Failed: 0 };
    const dailyData = {};

    collections.forEach(collection => {
      if (collection.Entries && Array.isArray(collection.Entries)) {
        collection.Entries.forEach(entry => {
          totalDPDCount++;
          
          const outstandingAmount = parseFloat(entry.Sum_Of_Total_Outstanding) || 0;
          const collectingMoney = parseFloat(entry.Collecting_Money) || 0;
          const dpdDays = parseInt(entry.Max_of_DPD) || 0;
          
          totalOutstanding += outstandingAmount;
          
          const status = entry.Status || 'Pending';
          
          if (status === 'Collected') {
            collectedCount++;
            statusCounts.Collected++;
            totalCollected += collectingMoney || outstandingAmount;
          } else if (status === 'Pending') {
            pendingCount++;
            statusCounts.Pending++;
            if (collectingMoney > 0) {
              totalCommitted += collectingMoney;
            }
          } else if (status === 'Contacted') {
            contactedCount++;
            statusCounts.Contacted++;
            if (collectingMoney > 0) {
              totalCommitted += collectingMoney;
            }
          } else if (status === 'Failed') {
            failedCount++;
            statusCounts.Failed++;
          }

          if (dpdDays <= 15) dpdRanges['0-15']++;
          else if (dpdDays <= 30) dpdRanges['16-30']++;
          else if (dpdDays <= 60) dpdRanges['31-60']++;
          else dpdRanges['60+']++;

          const dateKey = new Date(collection.Date).toISOString().split('T')[0];
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
              date: dateKey,
              collected: 0,
              committed: 0,
              outstanding: 0,
              count: 0
            };
          }
          
          if (status === 'Collected') {
            dailyData[dateKey].collected += collectingMoney || outstandingAmount;
          } else if ((status === 'Pending' || status === 'Contacted') && collectingMoney > 0) {
            dailyData[dateKey].committed += collectingMoney;
          }
          
          dailyData[dateKey].outstanding += outstandingAmount;
          dailyData[dateKey].count++;
        });
      }
    });

    const collectionRate = totalOutstanding > 0 
      ? ((totalCollected / totalOutstanding) * 100).toFixed(1) 
      : 0;

    const commitmentRate = totalOutstanding > 0 
      ? (((totalCollected + totalCommitted) / totalOutstanding) * 100).toFixed(1) 
      : 0;

    const performancePercentage = totalDPDCount > 0 
      ? ((collectedCount / totalDPDCount) * 100).toFixed(1) 
      : 0;

    res.send({
      success: true,
      employee: {
        _id: employee._id,
        name: `${employee.First_Name || ''} ${employee.Last_Name || ''}`.trim(),
        employeeId: employee.Employee_ID,
        email: employee.Email,
        phone: employee.Phone
      },
      collections,
      statistics: {
        totalDPDCount,
        pendingCount,
        collectedCount,
        contactedCount,
        failedCount,
        totalOutstanding: Math.round(totalOutstanding),
        totalCollected: Math.round(totalCollected),
        totalCommitted: Math.round(totalCommitted),
        totalPipeline: Math.round(totalCollected + totalCommitted),
        collectionRate: parseFloat(collectionRate),
        commitmentRate: parseFloat(commitmentRate),
        performancePercentage: parseFloat(performancePercentage),
        dpdRanges,
        statusCounts,
        dailyData: Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date))
      },
      filterDate: startOfDay.toISOString().split('T')[0]
    });

  } catch (err) {
    console.error('Error fetching employee DPD details:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch employee details',
      error: err.message
    });
  }
};


export const updatedpdcollection = async (req, res, next) => {
  try {
    const { _id } = req.query;
    const { collectionId, entryIndex, updatedEntry } = req.body;

    // Check if this is an entry-level update (from salesperson)
    if (collectionId && entryIndex !== undefined && updatedEntry) {
      // Update specific entry using MongoDB array update
      const updatedCollection = await DPDCollection.findOneAndUpdate(
        { _id: collectionId },
        {
          $set: {
            [`Entries.${entryIndex}.Collecting_Money`]: parseFloat(updatedEntry.Collecting_Money) || 0,
            [`Entries.${entryIndex}.Remarks`]: updatedEntry.Remarks || '',
            [`Entries.${entryIndex}.Status`]: updatedEntry.Status || 'Pending'
          }
        },
        { new: true, runValidators: true }
      ).populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email');

      if (!updatedCollection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Entry updated successfully',
        data: updatedCollection
      });
    }

    // Otherwise, it's a full collection update (from admin)
    const updatedCollection = await DPDCollection.findByIdAndUpdate(
      _id,
      req.body,
      { new: true, runValidators: true }
    ).populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email');

    if (!updatedCollection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'DPD Collection updated successfully',
      data: updatedCollection
    });
  } catch (err) {
    console.error('Error updating DPD collection:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update DPD collection',
      error: err.message
    });
  }
};

// Delete DPD Collection
export const deletedpdcollection = async (req, res, next) => {
  try {
 const { _id } = req.query;
    await DPDCollection.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'DPD Collection deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting DPD collection:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete DPD collection',
      error: err.message
    });
  }
};

// Add this new function to your DPDCollectionController.js

export const deleteDpdEntry = async (req, res, next) => {
  try {
    const { collectionId, entryIndex } = req.body;

    if (!collectionId || entryIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Collection ID and entry index are required'
      });
    }

    // Find the collection
    const collection = await DPDCollection.findById(collectionId);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    // Check if entry index is valid
    if (entryIndex < 0 || entryIndex >= collection.Entries.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entry index'
      });
    }

    // Get customer name for confirmation
    const deletedCustomer = collection.Entries[entryIndex].Customer_Name;

    // Remove the entry at the specified index
    collection.Entries.splice(entryIndex, 1);

    // If no entries left, you might want to delete the entire collection
    if (collection.Entries.length === 0) {
      await DPDCollection.findByIdAndDelete(collectionId);
      return res.status(200).json({
        success: true,
        message: `Customer entry deleted. Collection removed as it had no remaining entries.`,
        deletedCustomer,
        collectionDeleted: true
      });
    }

    // Save the updated collection
    await collection.save();

    res.status(200).json({
      success: true,
      message: `Customer entry "${deletedCustomer}" deleted successfully`,
      deletedCustomer,
      remainingEntries: collection.Entries.length,
      data: collection
    });

  } catch (err) {
    console.error('Error deleting DPD entry:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete entry',
      error: err.message
    });
  }
};


// Admin: Get all DPD collections across a date range, grouped by employee.
// Used only by the export feature — no pagination, returns everything at once.
export const getAdminDpdCollectionsRange = async (req, res, next) => {
  try {
    const { startDate, endDate, globalfilter = '' } = req.query;
 
    const userRole = req.user?.Role;
 
    if (userRole === 'Sales_Man') {
      return res.status(403).send({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
 
    if (!startDate || !endDate) {
      return res.status(400).send({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
 
    const rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);
 
    // Fetch every DPD collection within the whole range in one query
    const rangeCollections = await DPDCollection.find({
      Date: { $gte: rangeStart, $lte: rangeEnd }
    })
      .populate('Employee_ID', 'Image First_Name Last_Name Employee_ID Email Role')
      .sort({ createdAt: -1 });
 
    // Group collections by employee
    const collectionsByEmployee = {};
 
    rangeCollections.forEach(collection => {
      const employeeId = collection.Employee_ID?._id?.toString() || collection.Employee_ID?.toString();
 
      if (!collectionsByEmployee[employeeId]) {
        collectionsByEmployee[employeeId] = {
          employeeId: employeeId,
          employeeName: collection.Employee_Name ||
                       (collection.Employee_ID?.First_Name && collection.Employee_ID?.Last_Name
                         ? `${collection.Employee_ID.First_Name} ${collection.Employee_ID.Last_Name}`
                         : 'Unknown'),
          employeeEmail: collection.Employee_ID?.Email || '',
          employeeData: collection.Employee_ID,
          collections: []
        };
      }
 
      collectionsByEmployee[employeeId].collections.push(collection);
    });
 
    // Build employee search filter (for Sales_Man role only)
    let employeeFilter = { Role: 'Sales_Man' };
 
    if (globalfilter) {
      const searchRegex = { $regex: globalfilter, $options: 'i' };
      employeeFilter.$or = [
        { First_Name: searchRegex },
        { Last_Name: searchRegex },
        { Email: searchRegex },
        { Employee_ID: searchRegex }
      ];
    }
 
    // Get all salesmen matching the search
    const allSalesmen = await Employee.find({ ...employeeFilter, Status: 'Active' })
      .select('Image First_Name Last_Name Employee_ID Email Role')
      .sort({ First_Name: 1 });
 
    // Combine employees with their DPD collections across the whole range (or empty array if none)
    const combinedData = allSalesmen.map(emp => {
      const employeeId = emp._id.toString();
      const employeeCollections = collectionsByEmployee[employeeId];
 
      if (employeeCollections) {
        return employeeCollections;
      } else {
        return {
          employeeId: employeeId,
          employeeName: `${emp.First_Name || ''} ${emp.Last_Name || ''}`.trim(),
          employeeEmail: emp.Email || '',
          employeeData: emp,
          collections: []
        };
      }
    });
 
    res.send({
      success: true,
      resdata: combinedData,
      totallength: combinedData.length,
      userRole,
      rangeStart: rangeStart.toISOString().split('T')[0],
      rangeEnd: rangeEnd.toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Error fetching admin DPD collections range:', err);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch DPD collections for range',
      error: err.message
    });
  }
};