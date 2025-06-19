import React, { useState, useEffect, useContext, useRef } from "react";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CameraIcon } from "@heroicons/react/24/outline";

const DoctorProfile = () => {
  const { dToken, backendUrl, logout } = useContext(DoctorContext);
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState(null);
  const [profile, setProfile] = useState({});
  const [doctorId, setDoctorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Redirect to login if no token
  if (!dToken) {
    console.log('No dToken found, redirecting to login');
    navigate("/doctor/login");
    toast.error("Vui lòng đăng nhập để tiếp tục.");
    return null;
  }

  // Fetch doctor ID
  useEffect(() => {
    const fetchId = async () => {
      try {
        console.log('Fetching doctor ID with dToken:', dToken);
        const { data } = await axios.get(`${backendUrl}/doctor/id`, {
          headers: { Authorization: `Bearer ${dToken}` },
        });
        console.log("Fetch ID response:", data);
        if (data.id) {
          setDoctorId(data.id);
        } else {
          throw new Error(data.message || "Lỗi khi lấy ID bác sĩ");
        }
      } catch (error) {
        console.error("Lỗi khi lấy ID bác sĩ:", error);
        toast.error("Không thể lấy thông tin ID bác sĩ");
        if (error.response?.status === 401) {
          logout();
        }
        setLoading(false);
      }
    };
    fetchId();
  }, [dToken, backendUrl, logout]);

  // Fetch doctor profile data
  useEffect(() => {
    if (!dToken || !doctorId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        console.log('Fetching profile with dToken:', dToken, 'doctorId:', doctorId);
        const { data } = await axios.get(`${backendUrl}/doctor/profile/${doctorId}`, {
          headers: { Authorization: `Bearer ${dToken}` },
        });
        console.log("Fetch profile response:", data);
        if (data.success) {
          const profileData = {
            ...data.data,
            experience: data.data.experience || 0,
            fees: data.data.fees || 0,
          };
          setProfile(profileData);
          if (data.data.image) {
            const imageUrl = data.data.image.startsWith("http")
              ? data.data.image
              : `${backendUrl}/public/uploads/doctors/${data.data.image.replace(/^\/?/, "")}?t=${Date.now()}`;
            console.log("Profile image URL:", imageUrl);
            setProfileImage(imageUrl);
          } else {
            setProfileImage(null);
          }
        } else {
          throw new Error(data.message || "Lỗi khi lấy thông tin hồ sơ");
        }
      } catch (error) {
        console.error("Lỗi khi lấy hồ sơ:", error);
        toast.error("Không thể tải thông tin hồ sơ");
        if (error.response?.status === 401) {
          logout();
        }
        setProfileImage(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [dToken, doctorId, backendUrl, logout]);

  // Handle image upload
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Chỉ hỗ trợ định dạng JPEG, PNG hoặc GIF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    try {
      setImageUploading(true);
      console.log('Uploading image with dToken:', dToken);
      const formData = new FormData();
      formData.append("image", file);

      const response = await axios.put(
        `${backendUrl}/doctor/upload-image/${doctorId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${dToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("Upload image response:", response.data);

      if (response.data.imageUrl) {
        const newImageUrl = response.data.imageUrl.startsWith("http")
          ? response.data.imageUrl
          : `${backendUrl}/public/uploads/doctors/${response.data.imageUrl.replace(/^\/?/, "")}?t=${Date.now()}`;
        console.log("New image URL:", newImageUrl);
        setProfileImage(newImageUrl);
        setProfile((prev) => ({ ...prev, image: response.data.imageUrl }));
        toast.success("Cập nhật ảnh hồ sơ thành công");
      } else {
        throw new Error("Không nhận được URL ảnh từ server");
      }
    } catch (error) {
      console.error("Lỗi khi tải ảnh lên:", error);
      toast.error("Không thể cập nhật ảnh hồ sơ. Vui lòng thử lại.");
      if (error.response?.status === 401) {
        logout();
      }
      setProfileImage(null);
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name" || name === "email") return;
    if (name === "phone" && value && !/^\+?\d{0,15}$/.test(value)) return;
    if (name === "experience" || name === "fees") {
      if (value < 0) return;
      setProfile((prev) => ({ ...prev, [name]: value ? Number(value) : "" }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile.about || profile.experience === "" || profile.fees === "") {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (Giới thiệu, Kinh nghiệm, Phí tư vấn)");
      return;
    }
    if (profile.phone && !/^\+?\d{10,15}$/.test(profile.phone)) {
      toast.error("Số điện thoại phải có 10-15 chữ số, có thể bắt đầu bằng +");
      return;
    }

    try {
      setLoading(true);
      console.log('Updating profile with dToken:', dToken);
      const response = await axios.put(
        `${backendUrl}/doctor/update-profile/${doctorId}`,
        {
          ...profile,
          experience: Number(profile.experience),
          fees: Number(profile.fees),
        },
        {
          headers: {
            Authorization: `Bearer ${dToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Update profile response:", response.data);

      if (response.status === 200 && response.data?.updatedProfile) {
        setProfile({
          ...response.data.updatedProfile,
          experience: response.data.updatedProfile.experience || 0,
          fees: response.data.updatedProfile.fees || 0,
        });
        toast.success("Cập nhật hồ sơ thành công");
      } else {
        throw new Error("Không thể cập nhật hồ sơ");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật hồ sơ:", error);
      toast.error("Không thể cập nhật hồ sơ");
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        {/* Header */}
        <div className="bg-teal-600 text-white text-center py-4 rounded-t-2xl">
          <h2 className="text-2xl font-bold">Hồ sơ bác sĩ</h2>
        </div>

        {/* Content */}
        <div className="pt-6">
          {/* Profile Image Upload */}
          <div className="relative flex justify-center mb-6">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Hồ sơ bác sĩ"
                  className="w-28 h-28 rounded-full object-cover border-4 border-teal-500 shadow-md"
                  onError={(e) => {
                    console.warn(`Không thể tải ảnh: ${e.target.src}`);
                    setProfileImage(null);
                  }}
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-teal-100 border-4 border-teal-500 flex items-center justify-center text-3xl font-bold text-teal-600 shadow-md">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
                </div>
              )}
              {imageUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-full">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <label
                htmlFor="profile-image"
                className="absolute bottom-0 right-0 bg-teal-500 text-white p-2 rounded-full cursor-pointer hover:bg-teal-600 transition-shadow shadow-sm"
              >
                <CameraIcon className="w-5 h-5" />
                <input
                  id="profile-image"
                  type="file"
                  className="hidden"
                  onChange={handleImageChange}
                  accept="image/jpeg,image/png,image/gif"
                  ref={fileInputRef}
                />
              </label>
            </div>
          </div>

          {/* Profile Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                name="name"
                value={profile.name || ""}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={profile.email || ""}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                placeholder="VD: +1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <input
                type="text"
                name="location"
                value={profile.location || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                placeholder="Nhập địa chỉ của bạn"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu</label>
              <textarea
                name="about"
                value={profile.about || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                rows="4"
                placeholder="Giới thiệu về bản thân"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số năm kinh nghiệm</label>
              <input
                type="number"
                name="experience"
                value={profile.experience === 0 ? "" : profile.experience}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                placeholder="Nhập số năm kinh nghiệm"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phí tư vấn</label>
              <input
                type="number"
                name="fees"
                value={profile.fees === 0 ? "" : profile.fees}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                placeholder="Nhập phí tư vấn"
                min="0"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 focus:ring-2 focus:ring-teal-300 transition flex items-center justify-center"
              disabled={loading || imageUploading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              Lưu thay đổi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;