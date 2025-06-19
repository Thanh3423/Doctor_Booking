import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Appointment from './pages/Appointment';
import Doctors from './pages/Doctors';
import Login from './pages/Login';
import MyAppointment from './pages/MyAppointment';
import MyProfile from './pages/MyProfile';
import Services from './pages/Services';
import ChangePassword from "./pages/ChangePassword";
import Footer from './components/Footer';
import News from "./pages/News";
import NewsDetail from './pages/NewsDetail';
import AppointmentDetail from './pages/AppointmentDetail';


function App() {
  console.log(new Date().toString());
  const location = useLocation();

  // Hide Navbar on the login page
  const hideNavbar = location.pathname === '/login' || location.pathname === '/admin';
  const hideFooter = location.pathname === '/login' || location.pathname === '/admin';



  return (
    <div className="flex flex-col min-h-screen">
      {!hideNavbar && <Navbar />}

      <main className="flex-grow">
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/doctors' element={<Doctors />} />
          <Route path='/doctors/:speciality' element={<Doctors />} />
          <Route path='/login' element={<Login />} />
          <Route path='/my-profile' element={<MyProfile />} />
          <Route path='/my-appointment' element={<MyAppointment />} />
          <Route path='/appointment/:docId' element={<Appointment />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
          <Route path='/services' element={<Services />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path='/services/:docId' element={<Services />} />
          <Route path="/news" element={<News />} />
          <Route path='/*' element={<Home />} />
        </Routes>
      </main>

      <ToastContainer />

      {!hideFooter && <Footer />}
    </div>
  );

}

export default App;
