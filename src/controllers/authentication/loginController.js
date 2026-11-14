// import Admin from "../../models/AdminModel.js"
// import { Createtoken } from "../../services/tokenservice.js"

// export const login = async (req, res) => {
//   try {
//     const { Email, Password } = req.body;
//     const adminuser = await Admin.findOne({ Email, Password, Status: "Active" });
//     if (!adminuser) return res.send({ message: "Invalid credentials" });
//     const { _id, User_Name, Role } = adminuser;
//     const token = Createtoken({ id: _id, User_Name, Email,Role });
//     res.send({ message: "Login successful", adminuser: { _id, User_Name, Email, Role, token } });
//   } catch (error) {
//     console.error('Login Error:', error);
//     res.send({ message: "Server error" });
//   }
// };


// backend/controllers/authController.js
import Admin from "../../models/AdminModel.js"
import { Employee } from "../../models/EmployeeModel.js"
import { Createtoken } from "../../services/tokenservice.js"

export const login = async (req, res) => {
  try {
    const { Email, Password } = req.body;
    
    // First check if it's an Admin
    let user = await Admin.findOne({ Email, Password, Status: "Active" });
    let userType = "Admin";
    
    // If not Admin, check if it's an Employee (Salesman)
    if (!user) {
      user = await Employee.findOne({ Email, Password, Status: "Active" });
      userType = "Sales_Man";
    }
    
    if (!user) return res.send({ message: "Invalid credentials" });
    
    const { _id, First_Name, Last_Name, User_Name, Role } = user;
    const displayName = User_Name || `${First_Name}`;
    
    const token = Createtoken({ 
      id: _id, 
      Name: displayName, 
      Email,
      Role: Role || userType 
    });
    
    res.send({ 
      message: "Login successful", 
      user: { 
        _id, 
        Name: displayName,
        Email, 
        Role: Role || userType, 
        token 
      } 
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.send({ message: "Server error" });
  }
};