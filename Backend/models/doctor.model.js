const mongoose = require("mongoose");

const doctorSchema = mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    specialty: { type: mongoose.Schema.Types.ObjectId, ref: "specialty", required: true },
    location: { type: String, default: "", trim: true },
    experience: { type: Number, required: true, min: 0 },
    about: { type: String, required: true, trim: true },
    fees: { type: Number, required: true, min: 0 },
    image: { type: String, default: null },
    phone: { type: String, default: "", match: [/^\+?\d{10,15}$/, "Invalid phone number format"] },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    createdAt: { type: Date, default: Date.now },
}, { minimize: false });

doctorSchema.methods.calculateAverageRating = async function () {
    const reviews = await mongoose.model("Review").find({ doctorId: this._id });
    if (reviews.length === 0) {
        this.averageRating = 0;
        this.totalReviews = 0;
    } else {
        const totalRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
        this.averageRating = totalRatings / reviews.length;
        this.totalReviews = reviews.length;
    }
    await this.save();
    return this.averageRating;
};

doctorSchema.index({ specialty: 1 });

module.exports = mongoose.model("Doctor", doctorSchema);