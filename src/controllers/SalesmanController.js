import { Borrower } from "../models/BorrowerModel.js";



export const getstatsandborrowers = async (req, res) => {
  try {
    
    const salesmanName = req.user?.Name;  

    if (!salesmanName) {
      return res.status(400).json({ message: "Invalid token" });
    }

    // 1. Get borrowers assigned to this salesman
    const borrowers = await Borrower.find({ Sales_Man: salesmanName })
      .sort({ createdAt: -1 }); 

    // 2. Calculate statistics
    const totalBorrowers = borrowers.length;
    const activeBorrowers = borrowers.filter(b => b.Status === "Active").length;

    const totalApprovedAmount = borrowers.reduce((sum, b) => sum + (b.Approved_Line_Amount || 0),0);

    const totalActiveAmount = borrowers.reduce((sum, b) => sum + (b.Active_Line_Amount || 0),0);

    // 3. Final Response
    return res.send({success: true,stats: {totalBorrowers,activeBorrowers,totalApprovedAmount,totalActiveAmount},recentBorrowers: borrowers});
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({success: false,message: "Server error",error: error.message});
  }
};
