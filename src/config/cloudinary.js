const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload files to Cloudinary
const uploadToCloudinary = async (file, folder = 'medinet') => {
    try {
        const result = await cloudinary.uploader.upload(file.path, {
            folder: folder,
            resource_type: 'auto',
            transformation: [
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ]
        });
        return result;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('File upload failed');
    }
};

// Helper function to delete files from Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error('File deletion failed');
    }
};

module.exports = {
    cloudinary,
    uploadToCloudinary,
    deleteFromCloudinary
};
