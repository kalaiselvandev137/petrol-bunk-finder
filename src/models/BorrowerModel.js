import mongoose from 'mongoose'
import db from "../config/db.js";

const Borrowerschema = mongoose.Schema({
  // Basic Information
  Lead_ID: String,
  Program_ID: String,
  Program_Name: String,
  Routed_Program_Name: String,
  RM_Name: String,
  Dharamshi_Senchinl_A: String,
  Lender_Ref_ID: String,
  Partner_Ref_ID: String,
  Account_Ref_ID: String,
  Business_Name: String,
  Primary_Mobile: String,
  Business_PAN: String,
  Business_GSTin: String,
  Business_Type: String,
  CIN_Number: String,
  Business_Sector: String,
  Industry_Type: String,
  Sub_Industry_Type: String,
  Date_of_Incorporation: Date,
  Overall_Vintage_in_Months: Number,
  Vintage_with_Partner_in_Months: Number,
  Last_6_Months_Sale_with_Partner: Number,
  Last_12_Months_Sale_with_Partner: Number,
  
  // Personal Information
  Name: String,
  Father_Name: String,
  Aadhaar: String,
  PAN: String,
  DOB: Date,
  Gender: String,
  Employment_Status: String,
  Designation: String,
  Primary_Email: String,
  Secondary_Mobile: String,
  
  // Bank Information
  Disbursement_Bank_IFSC: String,
  Disbursement_Bank_Account_No: String,
  Disbursement_Bank_Account_Holder_Name: String,
  Disbursement_Bank_Account_Type: String,
  
  // Address Information
  Current_Address_Line: String,
  Current_Address_Locality: String,
  Sales_Man: String,
  Current_Address_Pincode: String,
  Current_Address_State: String,
  
  // Loan Details
  Line_Activation_Date: Date,
  Approved_Line_Amount: Number,
  Operative_Line_Amount: Number,
  Max_Active_Drawdowns: Number,
  Active_Line_Amount: Number,
  Line_Expiry_Date: Date,
  Adhoc_Line_Amount: Number,
  Adhoc_Line_Activation_Date: Date,
  Adhoc_Line_Expiry_Date: Date,
  DPD: Number,
  Days_in_Month: Number,
  Days_in_Year: Number,
  Tenure_Period: String,
  Tenure_Value: Number,
  Tenure_Period_Type: String,
  Tenure_Starts_At: String,
  
  // ROI and Fees
  ROI_Period: String,
  ROI_Slab_Based: String,
  ROI_Value: Number,
  Overdue_Same_as_ROI: String,
  Overdue_Slab_Based: String,
  Overdue_ROI_Value: Number,
  Penal_Same_as_ROI: String,
  Penal_Slab_Based: String,
  Penal_Value: Number,
  Penal_Tax: Number,
  Penal_Lag_Days: Number,
  Penal_Calculation_Type: String,
  Interest_Starts: String,
  Interest_Lock_in_Enabled: String,
  Interest_Lock_in_days: Number,
  
  // Upfront and Charges
  Upfront_Interest_Enabled: String,
  Upfront_Interest_Value_Type: String,
  Upfront_Interest_Value: Number,
  Upfront_Interest_Days: Number,
  Cashback_Enabled: String,
  Cashback_Payment_To: String,
  Cashback_Release_At: String,
  Cashback_Use_As: String,
  Cashback_Deduction_Enabled: String,
  Cashback_Deduction_Type: String,
  Cashback_Deduction_Value: Number,
  
  // Additional Features
  Holdback_Enabled: String,
  Holdback_Rate: Number,
  Holdback_Return_Enabled: String,
  Holdback_Return_Payment_To: String,
  Margin_Enabled: String,
  Margin_Value_Type: String,
  Margin_Value: Number,
  Margin_Receive_Before_Disbursement: String,
  
  // Processing Fee
  PF_Enabled: String,
  PF_Value_Type: String,
  PF_Value: Number,
  PF_GST: Number,
  EMI_Count: Number,
  EMI_Dates: String,
  EMI_Frequency: String,
  Pre_EMI_Enabled: String,
  Pre_EMI_Period: Number,
  Extend_Pre_EMI: String,
  Co_Lending_Split: String,
  
  // Status and Metadata
  Status: { type: String, default: 'Active' },
  Created_At: { type: Date, default: Date.now }
}, { timestamps: true })

const Borrower = db.model('borrowers', Borrowerschema)
export { Borrower }