import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const Saveimages = async (images, folpath) => {
  try {
    const isArray = Array.isArray(images);
    const imageMap = [];
    const processImage = (image) => {
      const binaryData = Buffer.from(image.buffer, 'base64');
      const timestamp = new Date().getTime();
      const directoryPath = path.join(__dirname, '../../uploads', folpath);
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
      }

      const filename = `${timestamp}_${image.originalname}`;
      const tempFilePath = path.join(directoryPath, filename);
      fs.writeFileSync(tempFilePath, binaryData);
      return `uploads/${folpath}/${filename}`;
    };
    if (isArray) {
      for (const image of images) {
        imageMap.push(processImage(image)); 
      }
    } else {
      return processImage(images); 
    }
    return imageMap;
  } catch (err) {
    console.error("Error saving images:", err);
    throw new Error('Image saving failed');
  }
};