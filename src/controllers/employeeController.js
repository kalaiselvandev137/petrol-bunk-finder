import { Employee } from "../models/EmployeeModel.js"
import { Saveimages } from "../services/Imageservice.js";

const attachImages = async (req) => {
  const imageFile = req.files?.Image?.[0];
  const faceFile = req.files?.face_verify_reference_image?.[0];

  if (imageFile) {
    req.body.Image = await Saveimages(imageFile, 'Employees');
  }
  if (faceFile) {
    req.body.face_verify_reference_image = await Saveimages(faceFile, 'Employees');
  }
};

export const getallEmployees = async (req, res, next) => {
  try {
    const { first, rows, globalfilter, colfilter } = req.query;
    const fieldArray = Object.keys(Employee.schema.obj);
    const globalFilter = globalfilter? {$or: fieldArray.filter((field) => Employee.schema.path(field) instanceof mongoose.Schema.Types.String).map((field) => ({ [field]: { $regex: globalfilter, $options: 'i' } })),}: {};
    const filter = colfilter ? { ...globalFilter, ...colfilter } : globalFilter;
  const resdata = await Employee.find(filter).skip(first).limit(rows);
    const totallength = await Employee.countDocuments(filter);
    res.send({ resdata, totallength });
  } catch (err) {
    console.error(err);
    res.send('Internal Server Error');
  }
};


export const saveEmployee = async (req, res, next) => {
  try {
      await attachImages(req);
      
      console.log("Request body after adding image path:", req.body);
      
      const resdata = await new Employee(req.body).save();
      res.send(resdata);
  } catch (err) {
      console.error("Error saving Employee:", err);
      res.send({ message: 'Error saving Employee' });
  }
};



export const updateEmployee = async (req, res, next) => {
  try {
    const { _id } = req.query;  
    await attachImages(req);
    const updatedEmployee = await Employee.findOneAndUpdate({ _id },{ $set: req.body }, { new: true }   );
    if (!updatedEmployee) {
      return res.send({ message: 'Employee not found' });
    }

    res.send(updatedEmployee);
  } catch (err) {
    console.error("Error updating Employee:", err);
    res.send({ message: 'Error updating Employee' });
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { _id } = req.query
    const resdata = await Employee.deleteOne({ _id })
    res.send(resdata)
  } catch (err) {
    console.error(err)
  }
}


export const getemployee = async (req,res,next) =>{
  try{
   const resdata = await Employee.find({ Status: "Active" },{ _id: 1, First_Name: 1 ,Role:1 ,Image:1});
   res.send(resdata)
  } catch(err){
    console.error(err)

  }
} 


// New: Get current user profile
export const getProfile = async (req, res, next) => {
  try {
    // req.user is set by authMiddleware after verifying the token
    // The token contains 'id' not '_id'
    const userId = req.user.id || req.user._id;
    
    console.log("Fetching profile for user ID:", userId);
    console.log("req.user:", req.user);
    
    const employee = await Employee.findById(userId);
    
    if (!employee) {
      console.log("Employee not found for ID:", userId);
      return res.status(404).send({ message: 'User not found' });
    }
    
    console.log("Profile found:", employee);
    res.send(employee);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).send({ message: 'Error fetching profile', error: err.message });
  }
};

// New: Update current user profile
export const updateProfile = async (req, res, next) => {
  try {
    // The token contains 'id' not '_id'
    const userId = req.user.id || req.user._id;
    
    console.log("Updating profile for user ID:", userId);
    console.log("Update data:", req.body);
    
    // Handle image upload if present
    // allow first-time enrolment only; after that, only Admin routes can change it
    const existing = await Employee.findById(userId).select('face_verify_reference_image')
    if (existing?.face_verify_reference_image?.length) {
      delete req.files?.face_verify_reference_image
    }
    await attachImages(req)
    
    // Don't allow updating certain fields through profile update
    delete req.body.Role;
    delete req.body.Status;
    delete req.body.Email;
    
    const updatedEmployee = await Employee.findByIdAndUpdate(
      userId,
      { $set: req.body },
      { new: true }
    );
    
    if (!updatedEmployee) {
      console.log("Employee not found for update, ID:", userId);
      return res.status(404).send({ message: 'User not found' });
    }
    
    console.log("Profile updated successfully:", updatedEmployee);
    res.send(updatedEmployee);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send({ message: 'Error updating profile', error: err.message });
  }
};