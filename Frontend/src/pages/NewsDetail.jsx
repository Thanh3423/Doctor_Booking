import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../Context/AppContext";
import { toast } from "react-toastify";

const NewsDetail = () => {
    const { id } = useParams();
    const [newsItem, setNewsItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const { backEndUrl } = useContext(AppContext);
    const navigate = useNavigate();
    const isMounted = useRef(true);

    // Map English categories to Vietnamese
    const categoryTranslations = {
        "Health Tips": "Mẹo Sức Khỏe",
        "Clinic Updates": "Cập Nhật Phòng Khám",
        "Promotions": "Khuyến Mãi",
        "Events": "Sự Kiện",
        "Other": "Khác",
    };

    // Validate ID synchronously before rendering
    if (!id || id === "undefined" || !/^[0-9a-fA-F]{24}$/.test(id)) {
        toast.error("ID tin tức không hợp lệ.", { toastId: `invalid-id-${id}` });
        navigate("/news", { replace: true });
        return null;
    }

    useEffect(() => {
        window.scrollTo(0, 0);
        isMounted.current = true;
        const source = axios.CancelToken.source();

        const loadNewsDetail = async () => {
            try {
                console.log(`Fetching news detail for ID: ${id}`);
                // Fetch news detail
                const response = await axios.get(`${backEndUrl}/api/news/${id}`, {
                    headers: { "Content-Type": "application/json" },
                    cancelToken: source.token,
                });

                if (!response.data.data) {
                    throw new Error("Không tìm thấy tin tức.");
                }

                if (isMounted.current) {
                    setNewsItem(response.data.data);

                    // Attempt to increment view count
                    try {
                        console.log(`Incrementing view for ID: ${id}`);
                        await axios.patch(`${backEndUrl}/api/news/${id}/view`, {}, {
                            headers: { "Content-Type": "application/json" },
                            cancelToken: source.token,
                        });
                    } catch (viewError) {
                        console.warn(`Không thể cập nhật lượt xem cho ID ${id}:`, viewError.message);
                    }
                }
            } catch (error) {
                if (axios.isCancel(error)) {
                    return;
                }
                if (isMounted.current) {
                    if (error.response?.status === 404 || error.message === "Không tìm thấy tin tức.") {
                        toast.error("Không tìm thấy tin tức.", { toastId: `not-found-${id}` });
                    } else {
                        toast.error("Lỗi tải chi tiết tin tức. Vui lòng thử lại.", { toastId: `error-${id}` });
                        console.error("Lỗi tải tin tức:", error);
                    }
                    navigate("/news", { replace: true });
                }
            } finally {
                if (isMounted.current) {
                    setLoading(false);
                }
            }
        };

        loadNewsDetail();

        return () => {
            isMounted.current = false;
            source.cancel("Component unmounted or ID changed");
        };
    }, [id, backEndUrl, navigate]);

    const getNewsImageUrl = (image) => {
        if (!image || !image.trim()) return "/fallback-news-image.jpg";
        return `${backEndUrl}/images/uploads/news/${image.split('/').pop()}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <section className="bg-gray-100 py-6 md:py-8 font-sans min-h-screen">
                <div className="container mx-auto px-4 sm:px-6 flex gap-4 justify-center">
                    <div className="w-16"></div>
                    <div className="max-w-4xl">
                        <div className="text-center text-gray-500 text-sm animate-pulse">
                            Đang tải chi tiết tin tức...
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (!newsItem) {
        return null;
    }

    return (
        <section className="bg-gray-100 py-6 md:py-8 font-sans min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 flex gap-4 justify-center">
                <div className="w-16 flex-shrink-0">
                    <button
                        onClick={() => {
                            navigate("/news");
                            window.scrollTo(0, 0);
                        }}
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="Quay lại danh sách tin tức"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                </div>
                <div className="max-w-4xl flex-1">
                    <article>
                        <div className="mb-4">
                            <img
                                src={getNewsImageUrl(newsItem.image)}
                                alt={newsItem.title}
                                className="w-full h-48 md:h-64 object-cover rounded-lg"
                                onError={(e) => {
                                    e.target.src = "/fallback-news-image.jpg";
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center text-gray-500 text-xs">
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
                                {formatDate(newsItem.createdAt || new Date())}
                                <span className="mx-2">•</span>
                                <span>{newsItem.views || 0} lượt xem</span>
                                {newsItem.category && (
                                    <>
                                        <span className="mx-2">•</span>
                                        <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                                            {categoryTranslations[newsItem.category] || newsItem.category}
                                        </span>
                                    </>
                                )}
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                                {newsItem.title}
                            </h1>
                            <div
                                className="prose prose-base text-gray-700 max-w-none"
                                dangerouslySetInnerHTML={{ __html: newsItem.content }}
                            />
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
};

export default NewsDetail;