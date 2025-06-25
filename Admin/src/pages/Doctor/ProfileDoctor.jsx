import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CameraIcon } from "@heroicons/react/24/outline";

// Google Fonts for Vietnamese
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
  .font-vietnamese {
    font-family: 'Roboto', 'Arial', sans-serif;
  }
`;

const DoctorProfile = () => {
  const { dToken, backendUrl, logout } = useContext(DoctorContext);
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState(null);
  const [profile, setProfile] = useState({});
  const [doctorId, setDoctorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const fileInputRef = useRef(null);

  // Log backendUrl for debugging
  console.log('[DoctorProfile] backendUrl:', backendUrl);

  // Redirect to login if no token
  if (!dToken) {
    console.log('[DoctorProfile] No dToken found, redirecting to login');
    navigate("/doctor/login");
    toast.error("Vui lòng đăng nhập để tiếp tục.");
    return null;
  }

  // Fetch specialties
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        console.log('[DoctorProfile fetchSpecialties] Fetching specialties');
        const { data } = await axios.get(`${backendUrl}/api/specialty/all`, {
          headers: { Authorization: `Bearer ${dToken}` },
        });
        console.log('[DoctorProfile fetchSpecialties] Response:', data);
        if (data.success && data.data) {
          setSpecialties(data.data);
        } else {
          toast.error("Không thể tải danh sách chuyên khoa");
        }
      } catch (error) {
        console.error('[DoctorProfile fetchSpecialties] Error:', error);
        toast.error("Lỗi khi tải danh sách chuyên khoa");
      }
    };
    fetchSpecialties();
  }, [backendUrl, dToken]);

  // Get image URL with proxy support
  const getImageUrl = (image) => {
    if (!image || !image.trim() || image === 'null') {
      console.log('[DoctorProfile getImageUrl] No valid image provided, returning null');
      return null;
    }
    if (image.startsWith('http://') || image.startsWith('https://')) {
      console.log('[DoctorProfile getImageUrl] Image is full URL:', image);
      return image;
    }
    // Ensure the path starts with a single slash and append to backendUrl
    const cleanPath = image.replace(/^\/+/, '/');
    const url = `${backendUrl}${cleanPath}`;
    console.log('[DoctorProfile getImageUrl] Constructed URL:', url, 'from image:', image);
    return url;
  };

  // Memoize profile image URL with cache-busting
  const memoizedProfileImage = useMemo(() => {
    if (profile?.image) {
      const url = getImageUrl(profile.image);
      if (url) {
        return `${url}?t=${new Date().getTime()}`;
      }
    }
    console.log('[DoctorProfile memoizedProfileImage] No valid profile.image, returning null');
    return null;
  }, [profile?.image]);

  // Get initials from name for placeholder
  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  // Pre-load image to reduce flicker
  const preloadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        console.log('[DoctorProfile preloadImage] Image loaded:', url);
        resolve(url);
      };
      img.onerror = () => {
        console.error('[DoctorProfile preloadImage] Image load failed:', url);
        resolve(null);
      };
    });
  };

  // Fetch doctor ID
  useEffect(() => {
    const fetchId = async () => {
      try {
        console.log('[DoctorProfile fetchId] Fetching doctor ID with dToken:', dToken);
        const { data } = await axios.get(`${backendUrl}/doctor/id`, {
          headers: { Authorization: `Bearer ${dToken}` },
        });
        console.log("[DoctorProfile fetchId] Fetch ID response:", data);
        if (data.success && data.id) {
          setDoctorId(data.id);
        } else {
          throw new Error(data.message || "Không nhận được ID bác sĩ từ server");
        }
      } catch (error) {
        console.error("[DoctorProfile fetchId] Error:", error);
        toast.error(`Không thể lấy ID bác sĩ: ${error.response?.data?.message || error.message}`);
        if (error.response?.status === 401) {
          logout();
          navigate("/doctor/login");
        }
        setLoading(false);
      }
    };
    fetchId();
  }, [dToken, backendUrl, logout, navigate]);

  // Fetch doctor profile data
  useEffect(() => {
    if (!dToken || !doctorId) {
      console.log('[DoctorProfile fetchProfile] Skipping fetch: dToken or doctorId missing', { dToken, doctorId });
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        console.log('[DoctorProfile fetchProfile] Fetching profile with dToken:', dToken, 'doctorId:', doctorId);
        const { data } = await axios.get(`${backendUrl}/doctor/profile/${doctorId}`, {
          headers: { Authorization: `Bearer ${dToken}` },
        });
        console.log("[DoctorProfile fetchProfile] Fetch profile response:", data);
        if (data.success && data.data) {
          const profileData = {
            ...data.data,
            specialty: data.data.specialty || "", // Ensure specialty is _id
            experience: data.data.experience || 0,
            fees: data.data.fees || 0,
          };
          setProfile(profileData);
          if (data.data.image) {
            const imageUrl = getImageUrl(data.data.image);
            if (imageUrl) {
              const preloadedUrl = await preloadImage(imageUrl);
              setProfileImage(preloadedUrl);
            } else {
              setProfileImage(null);
            }
          } else {
            setProfileImage(null);
          }
        } else {
          throw new Error(data.message || "Lỗi khi lấy thông tin hồ sơ");
        }
      } catch (error) {
        console.error("[DoctorProfile fetchProfile] Error:", error);
        toast.error(`Không thể tải hồ sơ: ${error.response?.data?.message || error.message}`);
        if (error.response?.status === 401) {
          logout();
          navigate("/doctor/login");
        }
        setProfileImage(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [dToken, doctorId, backendUrl, logout, navigate]);

  // Handle image upload
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log('[DoctorProfile handleImageChange] No file selected');
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      console.warn('[DoctorProfile handleImageChange] Invalid file type:', file.type);
      toast.error("Chỉ hỗ trợ định dạng JPEG, PNG, GIF hoặc WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      console.warn('[DoctorProfile handleImageChange] File too large:', file.size);
      toast.error("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    try {
      setImageUploading(true);
      console.log('[DoctorProfile handleImageChange] Uploading image:', {
        file: file.name,
        type: file.type,
        size: file.size,
        doctorId,
        dToken,
      });
      const formData = new FormData();
      formData.append("image", file);

      const response = await axios.put(
        `${backendUrl}/doctor/upload-image/${doctorId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${dToken}`,
          },
        }
      );
      console.log("[DoctorProfile handleImageChange] Upload image response:", response.data);

      if (response.data.success && response.data.imageUrl) {
        const newImageUrl = getImageUrl(response.data.imageUrl);
        console.log('[DoctorProfile handleImageChange] Setting image URL:', newImageUrl);
        setProfileImage(newImageUrl);
        setProfile((prev) => ({ ...prev, image: response.data.imageUrl }));
        toast.success("Cập nhật ảnh hồ sơ thành công");
        preloadImage(newImageUrl).catch(() => {
          console.warn('[DoctorProfile handleImageChange] Preload image failed:', newImageUrl);
        });
      } else {
        throw new Error(response.data.message || "Không nhận được URL ảnh từ server");
      }
    } catch (error) {
      console.error("[DoctorProfile handleImageChange] Error:", error);
      toast.error(`Không thể cập nhật ảnh: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 401) {
        logout();
        navigate("/doctor/login");
      }
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
    if (!profile.about || profile.experience === "" || profile.fees === "" || !profile.specialty) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (Giới thiệu, Kinh nghiệm, Phí tư vấn, Chuyên khoa)");
      return;
    }
    if (profile.phone && !/^\+?\d{10,15}$/.test(profile.phone)) {
      toast.error("Số điện thoại phải có 10-15 chữ số, có thể bắt đầu bằng +");
      return;
    }

    try {
      setLoading(true);
      console.log('[DoctorProfile handleSubmit] Updating profile:', { doctorId, profile });
      const response = await axios.put(
        `${backendUrl}/doctor/update-profile/${doctorId}`,
        {
          experience: Number(profile.experience),
          fees: Number(profile.fees),
          specialty: profile.specialty,
          about: profile.about,
          phone: profile.phone || "",
          location: profile.location || "",
        },
        {
          headers: {
            Authorization: `Bearer ${dToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("[DoctorProfile handleSubmit] Update profile response:", response.data);

      if (response.data.success && response.data.updatedProfile) {
        setProfile({
          ...response.data.updatedProfile,
          specialty: response.data.updatedProfile.specialty || "",
          experience: response.data.updatedProfile.experience || 0,
          fees: response.data.updatedProfile.fees || 0,
        });
        toast.success("Cập nhật hồ sơ thành công");
      } else {
        throw new Error(response.data.message || "Không thể cập nhật hồ sơ");
      }
    } catch (error) {
      console.error("[DoctorProfile handleSubmit] Error:", error);
      toast.error(`Không thể cập nhật hồ sơ: ${error.message}`);
      if (error.response?.status === 401) {
        logout();
        navigate("/doctor/login");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-vietnamese">
        <style>{fontStyle}</style>
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-vietnamese">
      <style>{fontStyle}</style>
      <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        {/* Header */}
        <div className="bg-blue-600 text-white text-center py-4 rounded-t-2xl">
          <h2 className="text-2xl font-bold">Hồ sơ bác sĩ</h2>
        </div>

        {/* Content */}
        <div className="pt-6">
          {/* Profile Image Upload */}
          <div className="relative flex justify-center mb-6">
            <div className="relative">
              {imageUploading ? (
                <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  Đang tải...
                </div>
              ) : memoizedProfileImage ? (
                <img
                  src={memoizedProfileImage}
                  alt="Hồ sơ bác sĩ"
                  className="w-28 h-28 rounded-full object-cover border-4 border-blue-500 shadow-md"
                  onLoad={() => console.log('[DoctorProfile img] Image loaded:', memoizedProfileImage)}
                  onError={(e) => {
                    console.error('[DoctorProfile img onError] Error loading image:', {
                      src: e.target.src,
                      error: e.message || 'Unknown error',
                      status: e.target.status || 'N/A',
                    });
                    setProfileImage(null);
                    e.target.onerror = null;
                  }}
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl font-bold">
                  {getInitials(profile.name)}
                </div>
              )}
              <label
                htmlFor="profile-image"
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-shadow shadow-sm"
                title="Thay đổi ảnh hồ sơ"
              >
                <CameraIcon className="w-5 h-5" />
                <input
                  id="profile-image"
                  type="file"
                  className="hidden"
                  onChange={handleImageChange}
                  accept="image/jpeg,image/png,image/gif,image/webp"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Chuyên khoa</label>
              <select
                name="specialty"
                value={profile.specialty || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="">Chọn chuyên khoa</option>
                {specialties.map((spec) => (
                  <option key={spec._id} value={spec._id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Nhập địa chỉ của bạn"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu</label>
              <textarea
                name="about"
                value={profile.about || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Nhập phí tư vấn"
                min="0"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition flex items-center justify-center"
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