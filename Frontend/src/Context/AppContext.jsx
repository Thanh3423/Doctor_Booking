
import React, { createContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
    const currentSymbol = "$";
    const backEndUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    console.log('[AppContext] backEndUrl:', backEndUrl);

    const [doctor, setDoctor] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token") || "");
    const [userData, setUserData] = useState(JSON.parse(localStorage.getItem("userData")) || null);
    const [allDoctors, setAllDoctors] = useState([]);
    const [rating, setRating] = useState({});
    const [specializations, setSpecializations] = useState([]);
    const [doctorsFetched, setDoctorsFetched] = useState(false);
    const [specialtiesFetched, setSpecialtiesFetched] = useState(false);

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedUserData = localStorage.getItem("userData");
        console.log('[AppContext] Syncing token and userData from localStorage');
        if (storedToken && storedToken !== token) {
            console.log('[AppContext] Token updated from localStorage:', storedToken);
            setToken(storedToken);
        }
        if (storedUserData) {
            try {
                const parsedUserData = JSON.parse(storedUserData);
                console.log('[AppContext] Parsed userData:', parsedUserData);
                setUserData(parsedUserData);
            } catch (error) {
                console.error('[AppContext] Error parsing userData from localStorage:', error);
                localStorage.removeItem("userData");
                setUserData(null);
            }
        }
    }, []);

    const getDoctorData = useCallback(
        async (docId) => {
            if (!docId) {
                console.warn('[getDoctorData] Missing docId');
                toast.error("Yêu cầu ID bác sĩ");
                return null;
            }
            const cleanDocId = docId.trim(); // Ensure no whitespace
            console.log('[getDoctorData] Cleaned docId:', cleanDocId);
            if (!cleanDocId.match(/^[0-9a-fA-F]{24}$/)) {
                console.warn('[getDoctorData] Invalid docId format:', cleanDocId);
                toast.error("ID bác sĩ không hợp lệ");
                return null;
            }
            try {
                console.log(`[getDoctorData] Fetching doctor data for ID: ${cleanDocId}`);
                // Check if doctor exists in allDoctors
                const doctor = allDoctors.find((doc) => String(doc._id) === String(cleanDocId));
                if (doctor) {
                    console.log(`[getDoctorData] Found doctor in allDoctors:`, doctor);
                    setDoctor(doctor);
                    return doctor;
                }
                const { data } = await axios.get(`${backEndUrl}/doctor/public-profile/${cleanDocId}`);
                console.log(`[getDoctorData] API response for doctor ${cleanDocId}:`, data);
                if (data.success && data.data) {
                    setDoctor(data.data);
                    setAllDoctors((prev) => {
                        const exists = prev.some((doc) => String(doc._id) === String(data.data._id));
                        return exists ? prev : [...prev, data.data];
                    });
                    return data.data;
                } else {
                    console.warn('[getDoctorData] API error:', data.message);
                    toast.error(data.message || "Không thể tải hồ sơ bác sĩ");
                    setDoctor(null);
                    return null;
                }
            } catch (error) {
                console.error('[getDoctorData] Error fetching doctor data:', {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                    cleanDocId,
                });
                toast.error(error.response?.data?.message || "Lỗi khi tải hồ sơ bác sĩ");
                setDoctor(null);
                return null;
            }
        },
        [allDoctors, backEndUrl]
    );

    const getDoctorReview = useCallback(
        async (docId) => {
            if (!docId) {
                console.warn('[getDoctorReview] Missing docId');
                toast.error("Yêu cầu ID bác sĩ");
                return;
            }
            try {
                const { data } = await axios.get(`${backEndUrl}/doctor/rating/${docId}`);
                console.log(`[getDoctorReview] API response for doctor ${docId} reviews:`, data);
                if (data && typeof data.averageRating !== 'undefined') {
                    setRating((prevRatings) => ({
                        ...prevRatings,
                        [docId]: {
                            rating: parseFloat(data.averageRating) || 0,
                            reviews: data.totalReviews || 0,
                        },
                    }));
                } else {
                    console.warn('[getDoctorReview] API error:', data.message);
                    toast.error("Không thể tải đánh giá bác sĩ");
                }
            } catch (error) {
                console.error('[getDoctorReview] Error fetching reviews:', {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                });
                toast.error(error.response?.data?.message || "Lỗi khi tải đánh giá bác sĩ");
            }
        },
        [backEndUrl]
    );

    const allDoctorsList = useCallback(async () => {
        if (doctorsFetched) {
            console.log('[allDoctorsList] Doctors already fetched, skipping...');
            return;
        }
        try {
            console.log('[allDoctorsList] Calling API at:', `${backEndUrl}/doctor/public-all`);
            const { data } = await axios.get(`${backEndUrl}/doctor/public-all`);
            console.log('[allDoctorsList] API response for doctors list:', data);
            if (data.success && Array.isArray(data.data)) {
                // Sanitize doctor IDs
                const sanitizedDoctors = data.data.filter((doc) => {
                    const isValidId = doc._id && /^[0-9a-fA-F]{24}$/.test(String(doc._id));
                    if (!isValidId) {
                        console.warn('[allDoctorsList] Invalid doctor ID:', doc._id);
                    }
                    return isValidId;
                });
                console.log(
                    '[allDoctorsList] Sanitized Doctor IDs:',
                    sanitizedDoctors.map((doc) => ({
                        _id: doc._id,
                        name: doc.name,
                    }))
                );
                setAllDoctors(sanitizedDoctors);
                setDoctorsFetched(true);
            } else {
                console.warn('[allDoctorsList] API error:', data.message);
                toast.error(data.message || "Không thể tải danh sách bác sĩ");
                setAllDoctors([]);
            }
        } catch (error) {
            console.error('[allDoctorsList] Error fetching doctors list:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            toast.error(error.response?.data?.message || "Lỗi khi tải danh sách bác sĩ");
            setAllDoctors([]);
        }
    }, [backEndUrl, doctorsFetched]);

    const fetchSpecializations = useCallback(async () => {
        if (specialtiesFetched) {
            console.log('[fetchSpecializations] Specialties already fetched, skipping...');
            return;
        }
        try {
            console.log('[fetchSpecializations] Calling API at:', `${backEndUrl}/api/specialty/all`);
            const { data } = await axios.get(`${backEndUrl}/api/specialty/all`);
            console.log('[fetchSpecializations] API response for specializations:', data);
            if (data.success && Array.isArray(data.data)) {
                setSpecializations(data.data);
                setSpecialtiesFetched(true);
            } else {
                console.warn('[fetchSpecializations] API error:', data.message);
                toast.error(data.message || "Không thể tải danh sách chuyên khoa");
                setSpecializations([]);
            }
        } catch (error) {
            console.error('[fetchSpecializations] Error fetching specializations:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            toast.error(error.response?.data?.message || "Lỗi khi tải danh sách chuyên khoa");
            setSpecializations([]);
        }
    }, [backEndUrl, specialtiesFetched]);

    const loadUserProfileData = useCallback(async (forceReload = false) => {
        if (!token) {
            console.log('[loadUserProfileData] No token, clearing userData');
            setUserData(null);
            localStorage.removeItem('userData');
            return;
        }
        if (!forceReload && userData) {
            console.log('[loadUserProfileData] UserData exists, skipping unless forced:', userData);
            return;
        }
        try {
            console.log('[loadUserProfileData] Fetching profile from:', `${backEndUrl}/patient/my-profile`);
            const { data } = await axios.get(`${backEndUrl}/patient/my-profile`, {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('[loadUserProfileData] API response:', data);
            if (data.success && data.data) {
                const user = data.data.user || data.data;
                setUserData(user);
                localStorage.setItem('userData', JSON.stringify(user));
                console.log('[loadUserProfileData] Updated userData:', user);
            } else {
                console.warn('[loadUserProfileData] API error:', data.message);
                toast.error(data.message || "Không thể tải hồ sơ người dùng");
                setUserData(null);
                localStorage.removeItem('userData');
            }
        } catch (error) {
            console.error('[loadUserProfileData] Error fetching user profile:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            if (error.response?.status === 401) {
                console.log('[loadUserProfileData] Unauthorized, clearing storage');
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                setToken('');
                setUserData(null);
                toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            } else {
                toast.error(error.response?.data?.message || "Lỗi khi tải hồ sơ người dùng");
                setUserData(null);
                localStorage.removeItem('userData');
            }
        }
    }, [backEndUrl, token, userData]);

    useEffect(() => {
        if (!backEndUrl) {
            console.error('[AppContext] backEndUrl is not defined');
            toast.error("URL backend chưa được cấu hình");
            setAllDoctors([]);
            setSpecializations([]);
            return;
        }
        console.log('[AppContext] Initializing data fetch');
        allDoctorsList();
        fetchSpecializations();
        if (token) loadUserProfileData();
    }, [backEndUrl, allDoctorsList, fetchSpecializations, loadUserProfileData, token]);

    useEffect(() => {
        if (!token) {
            console.log('[AppContext] No token, clearing dependent states');
            setUserData(null);
            setDoctor(null);
            setRating({});
            localStorage.removeItem('userData');
        }
    }, [token]);

    const value = {
        currentSymbol,
        backEndUrl,
        doctor,
        setDoctor,
        getDoctorData,
        token,
        setToken,
        userData,
        setUserData,
        loadUserProfileData,
        allDoctorsList,
        allDoctors,
        setAllDoctors,
        doctorsFetched,
        setDoctorsFetched,
        getDoctorReview,
        rating,
        setRating,
        specializations,
        setSpecializations,
        specialtiesFetched,
        setSpecialtiesFetched,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
