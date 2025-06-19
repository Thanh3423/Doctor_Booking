const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subdir;
    if (req.path.includes('doctor')) {
      subdir = 'doctors';
    } else if (req.path.includes('patient')) {
      subdir = 'misc';
    } else if (req.path.includes('news')) {
      subdir = 'news';
    } else if (req.path.includes('specialty')) {
      subdir = 'specialties';
    } else {
      subdir = 'misc'; // Default for other routes
    }
    const uploadPath = path.join(__dirname, '..', 'public', 'Uploads', subdir);
    try {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`Upload directory ensured: ${uploadPath}`);
    } catch (err) {
      console.error(`Error creating directory ${uploadPath}:`, err);
      return cb(new Error('Failed to create upload directory'));
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    crypto.randomBytes(6, (err, buf) => {
      if (err) {
        console.error('Error generating random bytes:', err);
        return cb(err);
      }
      const filename = `${Date.now()}-${buf.toString('hex')}${path.extname(file.originalname).toLowerCase()}`;
      console.log(`Generated filename: ${filename}`);
      cb(null, filename);
    });
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/; // Add webp support
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png, gif, webp) are allowed'));
    }
  },
});

module.exports = upload;