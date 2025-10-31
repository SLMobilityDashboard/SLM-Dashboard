"use client";

import { Bell, X, CheckCheck, Trash2, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface TaskNotification {
  QUERY_ID: string;
  TASK_NAME: string;
  SCHEDULED_TIME: string;
  START_TIME: string;
  END_TIME: string | null;
  STATUS: 'SUCCESS' | 'FAILED' | 'WARNING' | 'RUNNING' | 'PENDING';
  MESSAGE: string;
  IS_READ: boolean;
}

export default function TaskNotificationsPanel() {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const sql = `
        SELECT 
          QUERY_ID,
          TASK_NAME,
          SCHEDULED_TIME,
          START_TIME,
          END_TIME,
          STATUS,
          MESSAGE,
          IS_READ
        FROM SOURCE_DATA.LOGS.TASK_EXECUTION_LOG
        ORDER BY START_TIME DESC
        LIMIT 50
      `;
      
      const response = await fetch('/api/snowflake/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }
      
      const data = await response.json();
      setNotifications(data);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.IS_READ).length;

  const markAsRead = async (queryId: string) => {
    try {
      const sql = `
        UPDATE SOURCE_DATA.LOGS.TASK_EXECUTION_LOG
        SET IS_READ = TRUE
        WHERE QUERY_ID = '${queryId}'
      `;
      
      await fetch('/api/snowflake/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      setNotifications((prev) =>
        prev.map((n) => (n.QUERY_ID === queryId ? { ...n, IS_READ: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const sql = `
        UPDATE SOURCE_DATA.LOGS.TASK_EXECUTION_LOG
        SET IS_READ = TRUE
        WHERE IS_READ = FALSE
      `;
      
      await fetch('/api/snowflake/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      setNotifications((prev) => prev.map((n) => ({ ...n, IS_READ: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const removeNotification = async (queryId: string) => {
    try {
      const sql = `
        DELETE FROM SOURCE_DATA.LOGS.TASK_EXECUTION_LOG
        WHERE QUERY_ID = '${queryId}'
      `;
      
      await fetch('/api/snowflake/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      setNotifications((prev) => prev.filter((n) => n.QUERY_ID !== queryId));
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  };

  const clearAll = async () => {
    try {
      const sql = `TRUNCATE TABLE SOURCE_DATA.LOGS.TASK_EXECUTION_LOG`;
      
      await fetch('/api/snowflake/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear all:', error);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          emoji: "✅",
          color: "from-green-500 to-emerald-400",
          borderColor: "border-green-400/40",
          textColor: "text-green-400",
          bgColor: "bg-green-500/10",
          shadowColor: "shadow-green-500/30",
          title: "TASK COMPLETED"
        };
      case "FAILED":
        return {
          icon: <XCircle className="w-5 h-5" />,
          emoji: "❌",
          color: "from-red-500 to-rose-400",
          borderColor: "border-red-400/40",
          textColor: "text-red-400",
          bgColor: "bg-red-500/10",
          shadowColor: "shadow-red-500/30",
          title: "TASK FAILED"
        };
      case "WARNING":
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          emoji: "⚠️",
          color: "from-yellow-500 to-orange-400",
          borderColor: "border-yellow-400/40",
          textColor: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          shadowColor: "shadow-yellow-500/30",
          title: "TASK WARNING"
        };
      case "RUNNING":
        return {
          icon: <Clock className="w-5 h-5 animate-spin" />,
          emoji: "⚡",
          color: "from-blue-500 to-cyan-400",
          borderColor: "border-blue-400/40",
          textColor: "text-blue-400",
          bgColor: "bg-blue-500/10",
          shadowColor: "shadow-blue-500/30",
          title: "TASK RUNNING"
        };
      case "PENDING":
        return {
          icon: <Clock className="w-5 h-5" />,
          emoji: "⏳",
          color: "from-purple-500 to-pink-400",
          borderColor: "border-purple-400/40",
          textColor: "text-purple-400",
          bgColor: "bg-purple-500/10",
          shadowColor: "shadow-purple-500/30",
          title: "TASK PENDING"
        };
      default:
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          emoji: "ℹ️",
          color: "from-gray-500 to-slate-400",
          borderColor: "border-gray-400/40",
          textColor: "text-gray-400",
          bgColor: "bg-gray-500/10",
          shadowColor: "shadow-gray-500/30",
          title: "TASK UPDATE"
        };
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "Running...";
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:text-cyan-400 rounded-lg transition-colors text-slate-400"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full shadow-lg shadow-blue-500/50 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification Panel Overlay */}
      {mounted &&
        isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] animate-fadeIn"
              onClick={() => setIsOpen(false)}
            />

            {/* Main Notification Panel */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-4xl animate-systemAppear">
                {/* Glowing Border Effect */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 blur-xl animate-pulse" />

                  {/* Main Container */}
                  <div className="relative bg-gradient-to-b from-slate-900/95 to-black/95 border-2 border-blue-500/30 shadow-2xl shadow-blue-500/20 overflow-hidden">
                    {/* Corner Decorations */}
                    <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-blue-400/50" />
                    <div className="absolute top-0 right-0 w-32 h-32 border-r-4 border-t-4 border-blue-400/50" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 border-l-4 border-b-4 border-blue-400/50" />
                    <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-blue-400/50" />

                    {/* Header */}
                    <div className="relative border-b-2 border-blue-500/30 bg-gradient-to-r from-slate-900/60 via-blue-900/20 to-slate-900/60 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
                            <Bell className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-3xl font-black tracking-wider text-white uppercase system-font">
                              Task Execution Log
                            </h2>
                            <p className="text-blue-300 text-sm font-bold tracking-wide">
                              [ {unreadCount} UNREAD ALERTS • {notifications.length} TOTAL ]
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsOpen(false)}
                          className="text-slate-400 hover:text-white transition-colors duration-300 p-2 hover:bg-slate-800/50 rounded-lg"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Action Buttons */}
                      {notifications.length > 0 && (
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={fetchNotifications}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-blue-200 transition-all duration-300 font-bold text-sm tracking-wide uppercase"
                          >
                            <Clock className="w-4 h-4" />
                            Refresh
                          </button>
                          <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-blue-200 transition-all duration-300 font-bold text-sm tracking-wide uppercase"
                          >
                            <CheckCheck className="w-4 h-4" />
                            Mark All Read
                          </button>
                          <button
                            onClick={clearAll}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-red-900/30 border border-blue-500/30 hover:border-red-500/50 text-blue-300 hover:text-red-300 transition-all duration-300 font-bold text-sm tracking-wide uppercase"
                          >
                            <Trash2 className="w-4 h-4" />
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {loading && notifications.length === 0 ? (
                        <div className="p-12 text-center">
                          <Clock className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
                          <p className="text-blue-300 font-bold">Loading notifications...</p>
                        </div>
                      ) : error ? (
                        <div className="p-12 text-center">
                          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                          <p className="text-red-300 font-bold mb-2">Failed to load notifications</p>
                          <p className="text-sm text-slate-400">{error}</p>
                          <button
                            onClick={fetchNotifications}
                            className="mt-4 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-blue-500/30 text-blue-300 transition-all duration-300 font-bold text-sm tracking-wide uppercase"
                          >
                            Retry
                          </button>
                        </div>
                      ) : notifications.length > 0 ? (
                        <div className="p-4 space-y-3">
                          {notifications.map((notification, index) => {
                            const config = getStatusConfig(notification.STATUS);
                            return (
                              <div
                                key={notification.QUERY_ID}
                                className={`relative group transition-all duration-300 ${
                                  !notification.IS_READ
                                    ? "animate-slideIn"
                                    : "opacity-70 hover:opacity-100"
                                }`}
                                style={{ animationDelay: `${index * 0.05}s` }}
                              >
                                {/* Notification Card */}
                                <div
                                  className={`relative bg-gradient-to-r ${
                                    !notification.IS_READ
                                      ? `from-slate-800/80 to-slate-900/80 border-2 ${config.borderColor} ${config.shadowColor} shadow-lg`
                                      : "from-slate-800/40 to-slate-900/40 border-2 border-slate-700/40"
                                  } p-4 transition-all duration-300 hover:border-blue-400/60 group-hover:shadow-lg group-hover:shadow-blue-500/20`}
                                >
                                  {/* Status Badge */}
                                  <div className="absolute -left-2 -top-2 w-10 h-10">
                                    <div
                                      className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center text-xl shadow-lg ${config.shadowColor} ${
                                        notification.STATUS === 'RUNNING' ? 'animate-pulse' : ''
                                      }`}
                                    >
                                      {config.emoji}
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="flex gap-4 ml-6">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h4 className={`font-black text-base sm:text-lg uppercase tracking-wider system-font ${config.textColor}`}>
                                              {config.title}
                                            </h4>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                                              {notification.STATUS}
                                            </span>
                                          </div>
                                          <p className="text-white font-bold text-sm mb-2">
                                            {notification.TASK_NAME}
                                          </p>
                                          <p className="text-slate-300 text-sm font-medium leading-relaxed mb-3">
                                            {notification.MESSAGE}
                                          </p>
                                          
                                          {/* Metadata Grid */}
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                            <div className="flex flex-col gap-1 p-2 bg-slate-800/30 rounded border border-slate-700/30">
                                              <span className="text-slate-500 font-bold uppercase tracking-wide">Scheduled</span>
                                              <span className="text-cyan-400 font-mono">{formatTime(notification.SCHEDULED_TIME)}</span>
                                              <span className="text-slate-400">{formatDate(notification.SCHEDULED_TIME)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 p-2 bg-slate-800/30 rounded border border-slate-700/30">
                                              <span className="text-slate-500 font-bold uppercase tracking-wide">Started</span>
                                              <span className="text-blue-400 font-mono">{formatTime(notification.START_TIME)}</span>
                                              <span className="text-slate-400">{formatDate(notification.START_TIME)}</span>
                                            </div>
                                            {notification.END_TIME && (
                                              <div className="flex flex-col gap-1 p-2 bg-slate-800/30 rounded border border-slate-700/30">
                                                <span className="text-slate-500 font-bold uppercase tracking-wide">Duration</span>
                                                <span className={`font-mono font-bold ${config.textColor}`}>
                                                  {formatDuration(notification.START_TIME, notification.END_TIME)}
                                                </span>
                                                <span className="text-slate-400">{formatTime(notification.END_TIME)}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => removeNotification(notification.QUERY_ID)}
                                          className="text-slate-500 hover:text-red-400 transition-colors duration-300 p-1 hover:bg-slate-800/50 rounded"
                                        >
                                          <X className="w-5 h-5" />
                                        </button>
                                      </div>

                                      {/* Footer */}
                                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50 flex-wrap">
                                        <span className="text-xs text-slate-500 font-mono">
                                          ID: {notification.QUERY_ID.slice(0, 12)}...
                                        </span>
                                        {!notification.IS_READ && (
                                          <button
                                            onClick={() => markAsRead(notification.QUERY_ID)}
                                            className="ml-auto text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors duration-300 uppercase tracking-wide hover:underline"
                                          >
                                            → Mark as Read
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Unread Indicator */}
                                  {!notification.IS_READ && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50 animate-pulse" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-12 text-center">
                          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center border-2 border-blue-500/20">
                            <Bell className="w-12 h-12 text-slate-600" />
                          </div>
                          <p className="text-xl font-black text-slate-500 uppercase tracking-wider system-font">
                            No Task Logs Found
                          </p>
                          <p className="text-sm text-slate-600 mt-2 font-medium">
                            All notifications have been cleared
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Bar */}
                    <div className="border-t-2 border-blue-500/30 bg-gradient-to-r from-slate-900/60 via-blue-900/20 to-slate-900/60 p-4">
                      <div className="flex items-center justify-between text-xs text-blue-400 font-bold tracking-wider uppercase">
                        <span className="flex items-center gap-2">
                          <span>Snowflake Execution Monitor</span>
                          {loading && <Clock className="w-3 h-3 animate-spin" />}
                        </span>
                        <span className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-400' : 'bg-blue-400 animate-pulse'}`} />
                          {error ? 'Error' : 'Online'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      <style jsx>{`
        .system-font {
          font-family: Impact, "Arial Black", sans-serif;
          text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes systemAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-systemAppear {
          animation: systemAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </>
  );
}