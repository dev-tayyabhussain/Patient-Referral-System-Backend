const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const uploadsRoot = path.join(__dirname, '../../uploads');
const profileDir = path.join(uploadsRoot, 'profiles');
ensureDir(profileDir);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, profileDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
        cb(null, `${Date.now()}-${name}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, and WEBP images are allowed'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = { upload };


