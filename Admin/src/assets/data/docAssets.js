import axios from 'axios';
// Doctor Images
import doc1 from '../doctor_img/doc1.jpg';
import doc2 from '../doctor_img/doc2.png';
import doc3 from '../doctor_img/doc3.webp';
import doc4 from '../doctor_img/doc4.png';
import doc5 from '../doctor_img/doc5.png';
import doc6 from '../doctor_img/doc6.png';
import doc7 from '../doctor_img/doc7.png';
import doc8 from '../doctor_img/doc8.png';
import doc9 from '../doctor_img/doc9.png';
import doc10 from '../doctor_img/doc10.png';
import doc11 from '../doctor_img/doc11.png';
import doc12 from '../doctor_img/doc12.png';
import doc13 from '../doctor_img/doc13.png';
import doc14 from '../doctor_img/doc14.png';
import doc15 from '../doctor_img/doc15.png';

// const staticDoctors = [
//     {
//       name: 'Dr. Richard James',
//       image: 'doc1.jpg',  // Replace with uploaded image URL
//       speciality: 'General Physician',
//       degree: 'MBBS',
//       experience: '4 Years',
//       about: 'Dr. James is dedicated to providing comprehensive medical care...',
//       fees: 500,
//       rating: 4.5,
//       address: {
//         line1: '17th Cross, Richmond',
//         line2: 'Circle, Ring Road, London'
//       }
//     },
//     {
//       name: 'Dr. Emily Larson',
//       image: 'doc2.png',
//       speciality: 'Gynecologist',
//       degree: 'MBBS',
//       experience: '3 Years',
//       about: 'Dr. Larson specializes in women health care...',
//       fees: 600,
//       rating: 4.1,
//       address: {
//         line1: '27th Cross, Richmond',
//         line2: 'Circle, Ring Road, London'
//       }
//     },
    
//   ];

//   const uploadDoctors = async () => {
//     try {
//       const response = await axios.post('http://localhost:3000/doctor/addMany', staticDoctors);
//       console.log('Doctors added successfully:', response.data);
//     } catch (error) {
//       console.error('Error uploading doctors:', error);
//     }
//   };
  
  //uploadDoctors();


  
export const doctors = [
  {
      _id: 'doc1',
      name: 'Dr. Richard James',
      image: doc1,
      speciality: 'General Physician',
      degree: 'MBBS',
      experience: '4 Years',
      about: 'Dr. James is dedicated to providing comprehensive medical care with a focus on preventive medicine and early diagnosis. With 4 years of experience, he specializes in managing chronic conditions and promoting overall wellness.',
      fees: 500,
      rating: 4.5,
      address: {
          line1: '17th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
      // date: "2024-01-15",
      // time: "10:30 AM",
      // status: "past",
      // review: "",
  },
  {
      _id: 'doc2',
      name: 'Dr. Emily Larson',
      image: doc2,
      speciality: 'Gynecologist',
      degree: 'MBBS',
      experience: '3 Years',
      about: 'Dr. Larson specializes in women health care with a compassionate approach. Her practice focuses on comprehensive gynecological care, preventive health services, and reproductive health management.',
      fees: 600,
      rating: 4.1,
      address: {
          line1: '27th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
      // date: "2024-03-10",
      // time: "2:00 PM",
      // status: "upcoming",
      // review: "",
  },
  {
      _id: 'doc3',
      name: 'Dr. Sarah Patel',
      image: doc3,
      speciality: 'Dermatologist',
      degree: 'MBBS',
      experience: '1 Year',
      about: 'Dr. Patel is passionate about skin health and provides expert care in medical and cosmetic dermatology. She specializes in treating various skin conditions and stays current with the latest dermatological treatments.',
      fees: 300,
      rating: 5,
      address: {
          line1: '37th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc4',
      name: 'Dr. Christopher Lee',
      image: doc4.png,
      speciality: 'Pediatrician',
      degree: 'MBBS',
      experience: '2 Years',
      about: 'Dr. Lee is known for his gentle approach with young patients. He specializes in pediatric care, child development, and preventive healthcare for children of all ages.',
      fees: 400,
      rating: 5,
      address: {
          line1: '47th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc5',
      name: 'Dr. Jennifer Garcia',
      image: doc5.png,
      speciality: 'Neurologist',
      degree: 'MBBS',
      experience: '4 Years',
      about: 'Dr. Garcia brings expertise in treating complex neurological conditions. Her approach combines the latest neurological treatments with compassionate patient care to achieve optimal outcomes.',
      fees: 500,
      rating: 4.5,
      address: {
          line1: '57th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc6',
      name: 'Dr. Andrew Williams',
      image: doc6.png,
      speciality: 'Neurologist',
      degree: 'MBBS',
      experience: '4 Years',
      about: 'Dr. Williams specializes in neurological disorders and brain health. With extensive experience in treating various neurological conditions, he focuses on providing personalized treatment plans.',
      fees: 500,
      rating: 4.2,
      address: {
          line1: '57th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc7',
      name: 'Dr. Christopher Davis',
      image: doc7.png,
      speciality: 'General Physician',
      degree: 'MBBS',
      experience: '4 Years',
      about: 'Dr. Davis combines traditional medical practices with modern approaches to provide comprehensive healthcare. He emphasizes preventive care and patient education in his practice.',
      fees: 500,
      rating: 4,
      address: {
          line1: '17th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc8',
      name: 'Dr. Timothy White',
      image: doc8.png,
      speciality: 'Gynecologist',
      degree: 'MBBS',
      experience: '3 Years',
      about: 'Dr. White is dedicated to providing comprehensive women healthcare. He specializes in both routine gynecological care and complex reproductive health issues.',
      fees: 600,
      rating: 5,
      address: {
          line1: '27th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc9',
      name: 'Dr. Ava Mitchell',
      image: doc9.png,
      speciality: 'Dermatologist',
      degree: 'MBBS',
      experience: '1 Year',
      about: 'Dr. Mitchell combines aesthetic dermatology with medical skin care. She is particularly interested in treating chronic skin conditions and providing cosmetic dermatology services.',
      fees: 300,
      rating: 4,
      address: {
          line1: '37th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc10',
      name: 'Dr. Jeffrey King',
      image: doc10.png,
      speciality: 'Pediatrician',
      degree: 'MBBS',
      experience: '2 Years',
      about: 'Dr. King specializes in pediatric care with a focus on developmental health. He creates a friendly, comfortable environment for young patients and their families.',
      fees: 400,
      rating: 4,
      address: {
          line1: '47th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc11',
      name: 'Dr. Zoe Kelly',
      image: doc11.png,
      speciality: 'Neurologist',
      degree: 'MBBS',
      experience: '4 Years',
      about: 'Dr. Kelly is known for her expertise in treating neurological disorders. She takes a holistic approach to neurological care, considering both medical and lifestyle factors.',
      fees: 500,
      rating: 3,
      address: {
          line1: '57th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc12',
      name: 'Dr. Patrick Harris',
      image: doc12.png,
      speciality: 'Neurologist',
      degree: 'MBBS',
      experience: '4 Years',
      about: 'Dr. Harris specializes in diagnostic neurology and treatment of complex neurological conditions. His practice emphasizes patient education and comprehensive care plans.',
      fees: 500,
      rating: 3.5,
      address: {
          line1: '57th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc13',
      name: 'Dr. Chloe Evans',
      image: doc13.png,
      speciality: 'General Physician',
      degree: 'MBBS',
      experience: '4 Years',
      about: 'Dr. Evans provides comprehensive primary care services. She emphasizes preventive medicine and building long-term relationships with her patients for better health outcomes.',
      fees: 500,
      rating: 4,
      address: {
          line1: '17th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc14',
      name: 'Dr. Ryan Martinez',
      image: doc14.png,
      speciality: 'Gynecologist',
      degree: 'MBBS',
      experience: '3 Years',
      about: 'Dr. Martinez specializes in comprehensive women healthcare. He provides expert care in reproductive health, preventive medicine, and gynecological procedures.',
      fees: 600,
      rating: 4.1,
      address: {
          line1: '27th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  },
  {
      _id: 'doc15',
      name: 'Dr. Amelia Hill',
      image: doc15.png,
      speciality: 'Dermatologist',
      degree: 'MBBS',
      experience: '1 Year',
      about: 'Dr. Hill focuses on both medical and cosmetic dermatology. She is passionate about helping patients achieve healthy skin through personalized treatment plans and education.',
      fees: 300,
      rating: 4.9,
      address: {
          line1: '37th Cross, Richmond',
          line2: 'Circle, Ring Road, London'
      }
  }
];
