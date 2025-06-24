import React, { useState, useContext, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { AppContext } from "../Context/AppContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CameraIcon } from "@heroicons/react/24/outline";

const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
  .font-vietnamese {
    font-family: 'Roboto', 'Arial', sans-serif;
  }
`;

const MyProfile = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const { userData, setUserData, token, backEndUrl, loadUserProfileData } = useContext(AppContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    address: "",
  });
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  axios.defaults.withCredentials = true;

  if (!token) {
    console.log("[MyProfile] No token, redirecting to login");
    navigate("/");
    return null;
  }

  const getImageUrl = (image) => {
    if (!image || !image.trim()) {
      console.log("[MyProfile getImageUrl] No image provided, returning null");
      return null;
    }
    if (image.startsWith("http://") || image.startsWith("https://")) {
      console.log("[MyProfile getImageUrl] Image is full URL:", image);
      return `${image}?t=${Date.now()}`;
    }
    const backendUrl = backEndUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const cleanPath = image.replace(/^\/?(?:public\/)?(?:[Uu]ploads\/)?(?:misc\/)?/, "").replace(/^\/+/, "");
    const url = `${backendUrl}/images/uploads/misc/${cleanPath}?t=${Date.now()}`;
    console.log("[MyProfile getImageUrl] Constructed URL:", url, "from image:", image);
    return url;
  };

  const memoizedProfileImage = useMemo(() => {
    const url = getImageUrl(userData?.image);
    console.log("[MyProfile memoizedProfileImage] Generated image URL:", url);
    return url;
  }, [userData?.image]);

  useEffect(() => {
    console.log("[MyProfile useEffect] Starting profile data polling");
    loadUserProfileData(true);
    setProfileImage(memoizedProfileImage);

    // Initialize formData only if not already initialized
    if (!isFormInitialized && userData && Object.keys(userData).length > 0) {
      console.log("[MyProfile useEffect] Initializing formData with userData:", userData);
      setFormData({
        name: userData?.name ?? "",
        email: userData?.email ?? "",
        phoneNumber: userData?.phoneNumber ?? "",
        address: userData?.address ?? "",
      });
      setIsFormInitialized(true);
    }

    const intervalId = setInterval(() => {
      console.log("[MyProfile] Polling for profile updates");
      loadUserProfileData();
    }, 30000);

    const timeout = setTimeout(() => {
      if (!userData || Object.keys(userData).length === 0) {
        console.error("[MyProfile] Stuck in loading state after 5 seconds", { userData });
        toast.error("Không thể tải hồ sơ, vui lòng thử lại");
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeout);
    };
  }, [loadUserProfileData, memoizedProfileImage, userData, isFormInitialized]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log("[MyProfile handleChange] Updating formData:", { name, value });
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const preloadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        console.log("[MyProfile preloadImage] Image loaded:", url);
        resolve(url);
      };
      img.onerror = () => {
        console.error("[MyProfile preloadImage] Image load failed:", url);
        reject(new Error(`Không thể tải ảnh: ${url}`));
      };
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log("[MyProfile handleImageChange] No file selected");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      console.warn("[MyProfile handleImageChange] Invalid file type:", file.type);
      toast.error("Vui lòng chọn file ảnh (JPEG, PNG, hoặc WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      console.warn("[MyProfile handleImageChange] File too large:", file.size);
      toast.error("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    try {
      setIsImageLoading(true);
      const formData = new FormData();
      formData.append("image", file);

      const backendUrl = backEndUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      console.log("[MyProfile handleImageChange] Uploading image to:", `${backendUrl}/patient/my-profile/image`);
      const response = await axios.post(`${backendUrl}/patient/my-profile/image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("[MyProfile handleImageChange] Response:", response.data);
      if (response.data?.success && response.data?.data) {
        const newImageUrl = getImageUrl(response.data.data.image);
        await preloadImage(newImageUrl);
        setProfileImage(newImageUrl);
        setUserData({ ...userData, ...response.data.data });
        localStorage.setItem("userData", JSON.stringify({ ...userData, ...response.data.data }));
        toast.success("Cập nhật ảnh đại diện thành công");
        await loadUserProfileData(true);
      } else {
        console.warn("[MyProfile handleImageChange] No image in response:", response.data);
        toast.error(response.data.message || "Không thể cập nhật ảnh đại diện");
      }
    } catch (error) {
      console.error("[MyProfile handleImageChange] Error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      let errorMessage = error.response?.data?.message || "Lỗi khi cập nhật ảnh đại diện";
      if (error.response?.status === 401) {
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        navigate("/");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation
    if (!formData.name) {
      toast.error("Tên không được để trống");
      return;
    }
    if (formData.phoneNumber && !/^\+?\d{10,15}$/.test(formData.phoneNumber)) {
      toast.error("Định dạng số điện thoại không hợp lệ");
      return;
    }

    try {
      const backendUrl = backEndUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      console.log("[MyProfile handleSubmit] Submitting profile update:", formData);
      const response = await axios.post(
        `${backendUrl}/patient/my-profile`,
        {
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("[MyProfile handleSubmit] Response:", response.data);
      if (response.data?.success && response.data?.data) {
        setUserData(response.data.data);
        // Sync formData with updated userData after successful submission
        setFormData({
          name: response.data.data.name ?? "",
          email: response.data.data.email ?? "",
          phoneNumber: response.data.data.phoneNumber ?? "",
          address: response.data.data.address ?? "",
        });
        localStorage.setItem("userData", JSON.stringify(response.data.data));
        toast.success("Cập nhật hồ sơ thành công");
        await loadUserProfileData(true);
      } else {
        console.warn("[MyProfile handleSubmit] Unexpected response:", response.data);
        toast.error(response.data.message || "Không thể cập nhật hồ sơ");
      }
    } catch (error) {
      console.error("[MyProfile handleSubmit] Error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      let errorMessage = error.response?.data?.message || "Lỗi khi cập nhật hồ sơ";
      if (error.response?.status === 401) {
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        navigate("/");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  if (!userData || Object.keys(userData).length === 0) {
    console.log("[MyProfile] No userData or empty userData, showing loading", { userData });
    return (
      <div className="text-center mt-8 text-gray-600 font-vietnamese">
        <style>{fontStyle}</style>
        Đang tải...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-vietnamese">
      <style>{fontStyle}</style>
      <div className="w-full max-w-lg bg-white shadow-xl rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Hồ Sơ Của Tôi
        </h2>

        <div className="flex flex-col items-center mb-8 relative">
          <div className="relative">
            {isImageLoading ? (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Đang tải...</span>
              </div>
            ) : profileImage ? (
              <img
                src={profileImage}
                alt="Ảnh đại diện"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md"
                onError={(e) => {
                  console.error("[MyProfile img onError] Image load failed:", e.target.src);
                  setProfileImage(null);
                  e.target.onerror = null;
                }}
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                Chưa có ảnh
              </div>
            )}
            <label
              htmlFor="profile-image"
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
              title="Thay đổi ảnh đại diện"
            >
              <CameraIcon className="w-6 h-6" />
              <input
                id="profile-image"
                type="file"
                className="hidden"
                onChange={handleImageChange}
                accept="image/*"
              />
            </label>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Nhập họ và tên"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Nhập email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số Điện Thoại</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa Chỉ</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Nhập địa chỉ"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition duration-200"
          >
            Lưu Thay Đổi
          </button>
        </form>
      </div>
    </div>
  );
};

export default MyProfile;