import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../Context/AppContext";
import { toast } from "react-toastify";

const News = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const { backEndUrl } = useContext(AppContext);
    const navigate = useNavigate();

    // Map English categories to Vietnamese
    const categoryTranslations = {
        "Health Tips": "Mẹo Sức Khỏe",
        "Clinic Updates": "Cập Nhật Phòng Khám",
        "Promotions": "Khuyến Mãi",
        "Events": "Sự Kiện",
        "Other": "Khác",
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            const response = await axios.get(`${backEndUrl}/api/news`, {
                headers: { "Content-Type": "application/json" },
                params: { limit: 12, page: 1 },
            });
            setNews(response.data.data || []);
        } catch (error) {
            toast.error("Lỗi tải tin tức. Vui lòng thử lại.");
            console.error("Lỗi tải tin tức:", error);
        } finally {
            setLoading(false);
        }
    };

    const stripHtml = (html) => {
        const div = document.createElement("div");
        div.innerHTML = html;
        return div.textContent || div.innerText || "";
    };

    const truncateContent = (content, maxLength = 100) => {
        const plainText = stripHtml(content);
        if (plainText.length <= maxLength) return plainText;
        return plainText.slice(0, maxLength) + "...";
    };

    const getNewsImageUrl = (image) => {
        if (!image || !image.trim()) return "/fallback-news-image.jpg";
        return `${backEndUrl}/images/uploads/news/${image.split('/').pop()}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <section className="bg-gray-50 py-8 md:py-12 font-sans">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 tracking-tight">
                    Tin Tức & Sự Kiện
                </h2>

                {loading ? (
                    <div className="text-center text-gray-500 text-base animate-pulse">
                        Đang tải tin tức...
                    </div>
                ) : news.length === 0 ? (
                    <div className="text-center text-gray-500 text-base">
                        Hiện chưa có tin tức nào.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {news.map((item) => (
                            <article
                                key={item._id}
                                className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300"
                            >
                                <div className="relative">
                                    <img
                                        src={getNewsImageUrl(item.image)}
                                        alt={item.title}
                                        className="w-full h-48 object-cover transition-transform duration-300 hover:scale-105"
                                        onError={(e) => {
                                            e.target.src = "/fallback-news-image.jpg";
                                        }}
                                    />
                                    {item.category && (
                                        <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                            {categoryTranslations[item.category] || item.category}
                                        </span>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <div className="flex items-center text-gray-500 text-xs mb-2">
                                        <svg
                                            className="w-3 h-3 mr-1"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        {formatDate(item.createdAt || new Date())}
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors duration-200">
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-600 text-base mb-3 flex-grow line-clamp-3">
                                        {truncateContent(item.content)}
                                    </p>
                                    <button
                                        onClick={() => {
                                            navigate(`/news/${item._id}`);
                                            window.scrollTo(0, 0);
                                        }}
                                        className="mt-auto w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        aria-label={`Xem chi tiết ${item.title}`}
                                    >
                                        Đọc Thêm
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default News;