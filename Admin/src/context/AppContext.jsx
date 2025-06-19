import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export const AppContext = createContext();

const AppContextProvider = ({ children }) => {
    const currentSymbol = '$';
    const backEndUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    const [doctors, setDoctors] = useState(null);
    const [aToken, setAToken] = useState(localStorage.getItem('aToken') || '');
    const [allDoctors, setAllDoctors] = useState([]);
    const [allPatients, setAllPatients] = useState([]);
    const [allAppointments, setAllAppointments] = useState([]);
    const [loading, setLoading] = useState(false);

    const logout = () => {
        setAToken('');
        localStorage.removeItem('aToken');
        setAllDoctors([]);
        setAllPatients([]);
        setAllAppointments([]);
        toast.success('Đã đăng xuất thành công');
        window.location.href = '/admin/login';
    };



    const allDoctorsList = async () => {
        try {
            console.log('Fetching doctors from:', `${backEndUrl}/admin/doctor`, 'with token:', aToken);
            const { data } = await axios.get(`${backEndUrl}/admin/doctor`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            console.log('Doctors API Response:', data);
            if (data?.success && Array.isArray(data.data)) {
                setAllDoctors(data.data);
            } else {
                console.warn('Invalid doctors response:', data);
                toast.error(data?.message || 'Không thể tải danh sách bác sĩ');
                setAllDoctors([]);
            }
        } catch (error) {
            console.error('Error fetching doctors:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách bác sĩ');
            if (error.response?.status === 401 || error.response?.status === 403) {
                logout();
            }
        }
    };

    const allPatientsList = async () => {
        try {
            console.log('Fetching patients from:', `${backEndUrl}/admin/patient/all`, 'with token:', aToken);
            const { data } = await axios.get(`${backEndUrl}/admin/patient/all`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            console.log('Patients API Response:', data);
            if (data?.success && Array.isArray(data.data)) {
                setAllPatients(data.data);
            } else {
                console.warn('Invalid patients response:', data);
                toast.error(data?.message || 'Không thể tải danh sách bệnh nhân');
                setAllPatients([]);
            }
        } catch (error) {
            console.error('Error fetching patients:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách bệnh nhân');
            if (error.response?.status === 401 || error.response?.status === 403) {
                logout();
            }
        }
    };

    const allAppointmentList = async () => {
        try {
            console.log('Fetching appointments from:', `${backEndUrl}/admin/appointments`, 'with token:', aToken);
            const { data } = await axios.get(`${backEndUrl}/admin/appointments`, {
                headers: { Authorization: `Bearer ${aToken}` },
            });
            console.log('Appointments API Response:', data);
            if (data?.success && Array.isArray(data.data)) {
                const validStatuses = ['pending', 'completed', 'cancelled'];
                const validatedAppointments = data.data.map(appt => {
                    if (!validStatuses.includes(appt.status)) {
                        console.warn(`Invalid status for appointment ${appt._id}: ${appt.status}. Defaulting to 'pending'.`);
                        return { ...appt, status: 'pending' };
                    }
                    return appt;
                });
                console.log(
                    'Validated Appointments:',
                    validatedAppointments.map(a => ({
                        _id: a._id,
                        patientName: a.patientId?.name || 'N/A',
                        doctorName: a.doctorId?.name || 'N/A',
                        status: a.status,
                        appointmentDate: a.appointmentDate,
                        timeslot: a.timeslot,
                    }))
                );
                setAllAppointments(validatedAppointments);
            } else {
                console.warn('Invalid appointments response:', data);
                toast.error(data?.message || 'Không thể tải danh sách lịch hẹn');
                setAllAppointments([]);
            }
        } catch (error) {
            console.error('Error fetching appointments:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách lịch hẹn');
            if (error.response?.status === 401 || error.response?.status === 403) {
                logout();
            }
        }
    };

    useEffect(() => {
        console.log('Backend URL:', backEndUrl, 'aToken:', !!aToken);
        if (backEndUrl && aToken) {
            setLoading(true);
            Promise.all([allDoctorsList(), allPatientsList(), allAppointmentList()]).finally(() => setLoading(false));
        }
    }, [backEndUrl, aToken]);

    const value = {
        backEndUrl,
        currentSymbol,
        aToken,
        setAToken,
        allDoctors,
        setAllDoctors,
        allDoctorsList,
        allPatients,
        allPatientsList,
        allAppointments,
        allAppointmentList,
        logout,
        loading,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;