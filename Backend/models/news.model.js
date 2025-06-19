const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        image: {
            type: String,
            default: '',
        },
        category: {
            type: String,
            enum: ['Health Tips', 'Clinic Updates', 'Promotions', 'Events', 'Other'],
            default: 'Other',
        },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },
        publishAt: {
            type: Date,
            default: Date.now,
        },
        views: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('News', newsSchema);