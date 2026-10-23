import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Film, CheckCircle, Clock, Play, Folder, DollarSign,
  MessageSquare, ExternalLink, Calendar, ChevronRight, Video, LayoutDashboard,
  Mail, Bell, Globe, LogOut, MoreHorizontal, RefreshCw, Eye, Printer, Receipt, Building,
  Trash2, Send, Tag, Hash, UserMinus, Plus, Archive, Smartphone, Menu, X
} from 'lucide-react';
import { notificationManager } from '../services/notificationManager';

export const ClientPortal = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('review');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [shoots, setShoots] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected video for review player
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Digital Invoice Modal
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionTimecode, setRevisionTimecode] = useState('');
  const [revisionComment, setRevisionComment] = useState('');
  const [actionSuccessNotice, setActionSuccessNotice] = useState(null);

  // Client Delete Video State
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [isDeletingClientVideo, setIsDeletingClientVideo] = useState(false);

  // Client Delete Invoice State
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Client Studio Direct Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatInputTag, setChatInputTag] = useState('GENERAL');
  const [chatInputTimecode, setChatInputTimecode] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Client Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isRequestingNotif, setIsRequestingNotif] = useState(false);
  const [isSendingTestNotif, setIsSendingTestNotif] = useState(false);
  const [dismissNotifBanner, setDismissNotifBanner] = useState(false);
  const [notifFilter, setNotifFilter] = useState('ALL');

  const resolveVideoUrl = (url) => {
    if (!url) return '/uploads/videos/sample_hero_cut.mp4';
    if (typeof url === 'string' && url.includes('commondatastorage.googleapis.com')) {
      return url.includes('ElephantsDream')
        ? '/uploads/videos/sample_teaser_cut.mp4'
        : '/uploads/videos/sample_hero_cut.mp4';
    }
    return url;
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/client/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const notifData = await res.json();
        setNotifications(notifData.notifications || []);
        setUnreadNotificationsCount(notifData.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Error fetching client notifications:', e);
    }
  };

  const fetchClientMessages = async () => {
    try {
      const res = await fetch('/api/client/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
        setUnreadChatCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Error fetching client messages:', err);
    }
  };

  const markClientChatRead = async () => {
    try {
      await fetch('/api/client/messages/read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadChatCount(0);
      fetchClientMessages();
    } catch (e) {
      console.warn('Error marking client chat read:', e);
    }
  };

  const handleSendClientMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim() || isSendingChat) return;
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/client/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text: chatInputText.trim(),
          tag: chatInputTag,
          timecode: chatInputTimecode.trim() || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatInputText('');
        setChatInputTimecode('');
        fetchClientMessages();
        fetchNotifications();
      } else {
        alert(data.message || 'Failed to send message');
      }
    } catch (err) {
      alert(err.message || 'Network error sending message');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleExecuteClientDelete = async () => {
    if (!videoToDelete) return;
    setIsDeletingClientVideo(true);
    try {
      const res = await fetch(`/api/client/videos/${videoToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { success: res.ok, message: text || `Server error (${res.status})` };
        }
      }

      if (res.ok && data.success !== false) {
        showNotification(data.message || `Video cut "${videoToDelete.title}" removed from deliverables.`);
        if (selectedVideo?.id === videoToDelete.id) {
          setSelectedVideo(null);
        }
        setVideoToDelete(null);
        fetchClientData();
      } else {
        showNotification(data.message || data.error || 'Failed to remove video cut.', 'error');
      }
    } catch (err) {
      console.error('Client video delete error:', err);
      showNotification(err.message || 'Network error while removing video cut.', 'error');
    } finally {
      setIsDeletingClientVideo(false);
    }
  };

  const handleExecuteClientInvoiceDelete = async () => {
    if (!invoiceToDelete) return;
    setIsDeletingInvoice(true);
    try {
      const res = await fetch(`/api/client/invoices/${invoiceToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { success: res.ok, message: text || `Server error (${res.status})` };
        }
      }

      if (res.ok && data.success !== false) {
        showNotification(data.message || `Invoice #${invoiceToDelete.invoiceNumber} removed from your list.`);
        if (viewingInvoice?.id === invoiceToDelete.id) {
          setViewingInvoice(null);
        }
        setInvoiceToDelete(null);
        fetchClientData();
      } else {
        showNotification(data.message || data.error || 'Failed to remove invoice.', 'error');
      }
    } catch (err) {
      console.error('Client invoice delete error:', err);
      showNotification(err.message || 'Network error removing invoice.', 'error');
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleMarkNotificationRead = async (notifId = null) => {
    try {
      const res = await fetch('/api/client/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: notifId })
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadNotificationsCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  };

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [dashRes, vidRes, shtRes, invRes, notifRes] = await Promise.all([
        fetch('/api/client/dashboard', { headers }),
        fetch('/api/client/videos', { headers }),
        fetch('/api/client/shoots', { headers }),
        fetch('/api/client/invoices', { headers }),
        fetch('/api/client/notifications', { headers })
      ]);

      if (dashRes.ok) setDashboardData(await dashRes.json());
      if (vidRes.ok) {
        const vData = await vidRes.json();
        setVideos(vData.videos || []);
        if (vData.videos?.length > 0 && !selectedVideo) {
          setSelectedVideo(vData.videos[0]);
        }
      }
      if (shtRes.ok) setShoots((await shtRes.json()).shoots || []);
      if (invRes.ok) setInvoices((await invRes.json()).invoices || []);
      if (notifRes && notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
        setUnreadNotificationsCount(notifData.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load client portal data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchClientData();
      fetchClientMessages();
      // Auto-poll notifications & chat every 10s
      const pollTimer = setInterval(() => {
        fetchNotifications();
        fetchClientMessages();
      }, 10000);
      return () => clearInterval(pollTimer);
    }
  }, [token]);

  // Live tick countdown update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setVideos((prevVideos) =>
        prevVideos.map((v) => {
          const deadline = new Date(v.approvalDeadline).getTime();
          const diffMs = deadline - Date.now();
          return {
            ...v,
            remainingHours: Math.max(0, Math.floor(diffMs / 3600000)),
            remainingMinutes: Math.max(0, Math.floor((diffMs % 3600000) / 60000)),
            remainingSeconds: Math.max(0, Math.floor((diffMs % 60000) / 1000)),
            isDeadlinePassed: diffMs <= 0
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle notification click routing from phone notification bar (?tab=review, ?tab=chat, etc.)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam && ['review', 'shoots', 'chat', 'invoices', 'vault'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch (e) {
      console.warn('URL tab param parse error:', e);
    }
  }, []);

  // Sync notification bar permission status & auto-sync subscription if already granted
  useEffect(() => {
    if (notificationManager.isSupported()) {
      const perm = notificationManager.getPermissionState();
      setNotificationPermission(perm);
      if (perm === 'granted' && token) {
        notificationManager.requestPermission(token).catch(() => {});
      }
    }
  }, [token]);

  const handleEnableNotifications = async () => {
    setIsRequestingNotif(true);
    try {
      const res = await notificationManager.requestPermission(token);
      setNotificationPermission(notificationManager.getPermissionState());
      if (res.success) {
        showNotification(res.message);
      } else {
        showNotification(res.message);
      }
    } catch (e) {
      showNotification('Error enabling phone notifications.');
    } finally {
      setIsRequestingNotif(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsSendingTestNotif(true);
    try {
      const res = await notificationManager.sendTestNotification(token);
      showNotification(res.message);
    } catch (e) {
      showNotification('Error dispatching test alert.');
    } finally {
      setIsSendingTestNotif(false);
    }
  };

  const showNotification = (msg) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const handleApproveVideo = async (videoId) => {
    if (!confirm('Are you ready to officially approve this cut? Deliverables will be released for final master output.')) {
      return;
    }

    try {
      const res = await fetch(`/api/client/videos/${videoId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message);
        fetchClientData();
      } else {
        alert(data.message || 'Error approving video');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitRevision = async (e) => {
    e.preventDefault();
    if (!selectedVideo || !revisionComment) return;

    try {
      const res = await fetch(`/api/client/videos/${selectedVideo.id}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          comment: revisionComment,
          timecode: revisionTimecode || 'General'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Revision request logged! Our post-production team has received your notes.');
        setShowRevisionModal(false);
        setRevisionComment('');
        setRevisionTimecode('');
        fetchClientData();
      } else {
        alert(data.message || 'Error requesting revision');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePayInvoice = async (invoiceId) => {
    try {
      const res = await fetch(`/api/client/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message);
        if (viewingInvoice && viewingInvoice.id === invoiceId) {
          setViewingInvoice({ ...viewingInvoice, status: 'PAID' });
        }
        fetchClientData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const clientInfo = dashboardData?.client;

  const sidebarLinks = [
    { id: 'review', label: 'Review Stage', icon: LayoutDashboard },
    { id: 'chat', label: 'Studio Chat', icon: MessageSquare, badge: unreadChatCount },
    { id: 'deliverables', label: 'All Cuts', icon: Video },
    { id: 'shoots', label: 'Shoots', icon: Calendar },
    { id: 'invoices', label: 'Invoices', icon: Receipt }
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#1A2118] flex flex-col lg:flex-row w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {actionSuccessNotice && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border border-[#BAC8B0] bg-white text-[#3D4C33] text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-[#5E734F]" />
          {actionSuccessNotice}
        </div>
      )}

      {/* ======================================================== */}
      {/* MOBILE APP BAR & QUICK-NAV (Mobile / Tablet)             */}
      {/* ======================================================== */}
      <div className="lg:hidden border-b border-[#E7E2D7] bg-[#F7F5EF]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <Link to="/" className="flex items-center gap-2 group" title="Zenv Digital Home">
            <img 
              src="/app_icon.png" 
              alt="zenvdigital" 
              className="h-7 w-7 rounded-lg object-cover"
            />
            <span className="font-bold text-sm tracking-tight text-[#1A2118]">zenv<span className="text-[#3066E0]">digital</span></span>
            <span className="text-[10px] text-[#7D8876] font-mono uppercase font-semibold">Review</span>
          </Link>

          <div className="flex items-center gap-1.5">
            {/* Quick Chat icon with badge */}
            <button
              onClick={() => {
                setActiveTab('chat');
                markClientChatRead();
              }}
              aria-label="Studio Chat"
              className={`p-2 rounded-lg border transition-colors relative ${
                activeTab === 'chat'
                  ? 'bg-[#1A2118] text-white border-[#1A2118]'
                  : 'bg-white border-[#E7E2D7] text-[#1A2118]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#5E734F] text-white text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Quick Notification icon with badge */}
            <button
              onClick={() => setShowNotificationPanel(true)}
              aria-label="Activity Updates"
              className="p-2 rounded-lg border bg-white border-[#E7E2D7] text-[#1A2118] relative"
            >
              <Bell className="w-4 h-4 text-[#5E734F]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#8C2C2C] text-white text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-lg bg-white border border-[#E7E2D7] text-[#1A2118] hover:bg-[#EFECE5]"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Horizontal Scrollable Tab Bar for 1-Thumb Switching on Mobile */}
        <div className="overflow-x-auto no-scrollbar flex items-center gap-1 px-2.5 py-1.5 border-t border-[#EAE5DA] bg-[#F1EDE4]/70">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={`mobile-client-tab-${link.id}`}
                onClick={() => {
                  setActiveTab(link.id);
                  if (link.id === 'chat') markClientChatRead();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#1A2118] text-white shadow-xs'
                    : 'bg-white text-[#5A6354] border border-[#DDD9D0]'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{link.label}</span>
                {link.badge > 0 && (
                  <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${
                    isActive ? 'bg-[#5E734F] text-white' : 'bg-[#EAE5DA] text-[#1A2118]'
                  }`}>
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Off-Canvas Drawer (When hamburger is clicked) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-4/5 max-w-sm bg-[#F7F5EF] h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto border-r border-[#E7E2D7]">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E2D7]">
                <div className="flex items-center gap-2">
                  <img src="/app_icon.png" alt="zenvdigital" className="h-6 w-6 rounded-md object-cover" />
                  <span className="font-bold text-sm tracking-tight text-[#1A2118]">zenv<span className="text-[#3066E0]">digital</span></span>
                  <span className="text-[10px] font-mono text-[#7D8876] uppercase font-semibold">Review</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#5A6354] hover:bg-[#EAE5DA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Client Profile Card */}
              <div className="p-3 rounded-xl bg-white border border-[#E7E2D7] shadow-sm">
                <div className="flex items-center justify-between gap-1">
                  <div className="text-xs font-bold text-[#1A2118] truncate">{clientInfo?.company || 'Client Workspace'}</div>
                  {clientInfo?.status === 'HIBERNATED' && (
                    <span className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      Archived
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#7D8876] truncate">{user?.name || user?.email}</div>
              </div>

              {/* Navigation Links inside Drawer */}
              <nav className="space-y-1">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = activeTab === link.id;
                  return (
                    <button
                      key={`drawer-${link.id}`}
                      onClick={() => {
                        setActiveTab(link.id);
                        setIsMobileMenuOpen(false);
                        if (link.id === 'chat') markClientChatRead();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                        isActive
                          ? 'bg-[#E8E4DA] text-[#1A2118] font-bold shadow-none'
                          : 'text-[#6B7265] hover:text-[#1A2118] hover:bg-[#EFECE5] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#1A2118]' : 'text-[#7D8876]'}`} />
                        <span>{link.label}</span>
                      </div>
                      {link.badge > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#5E734F] text-white font-mono text-[10px] font-bold">
                          {link.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Controls */}
            <div className="pt-4 border-t border-[#E7E2D7] space-y-3">
              {clientInfo?.brandKitDriveFolderId && (
                <a
                  href={`https://drive.google.com/drive/folders/${clientInfo.brandKitDriveFolderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#F8F6F0] border border-[#E7E2D7] text-xs font-semibold text-[#3D4C33] transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-[#5E734F]" />
                    <span>Drive Asset Vault</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#7D8876]" />
                </a>
              )}

              <div className="p-3 rounded-xl bg-white border border-[#E7E2D7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#5E734F] text-white flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'CL'}
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-[#1A2118] truncate max-w-[130px]">{user?.name || 'Client'}</div>
                    <div className="text-[10px] text-[#7D8876] truncate max-w-[130px]">{user?.email}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* ======================================================== */}
      {/* LEFT MINIMAL SIDEBAR (CONCEPT 2 - MATCHING MOCKUP) */}
      {/* ======================================================== */}
      <aside className="hidden lg:flex w-64 border-r border-[#E7E2D7] bg-[#F7F5EF] flex-col justify-between shrink-0 min-h-screen sticky top-0 p-5">
        <div>
          {/* Studio & Client Brand Header (Merged seamlessly with background) */}
          <div className="pb-5 mb-6 border-b border-[#E7E2D7]">
            <Link to="/" className="flex flex-col gap-2 group" title="Zenv Digital Home">
              <div className="py-1 px-1 flex items-center gap-3">
                <img 
                  src="/app_icon.png" 
                  alt="zenvdigital" 
                  className="w-10 h-10 rounded-xl shadow-xs object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div>
                  <div className="font-bold text-base tracking-tight text-[#1A2118] leading-tight">
                    zenv<span className="text-[#3066E0]">digital</span>
                  </div>
                  <div className="text-[10px] text-[#7D8876] font-mono uppercase font-semibold">Client Review Suite</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-[10px] text-[#7D8876] font-mono uppercase font-semibold">Live Production</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5E734F] animate-pulse" />
              </div>
            </Link>

            <div className="mt-3 px-3 py-2 rounded-xl bg-white border border-[#E7E2D7] shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <div className="text-xs font-bold text-[#1A2118] truncate">{clientInfo?.company || 'Client Workspace'}</div>
                {clientInfo?.status === 'HIBERNATED' && (
                  <span className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Archived
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#7D8876] truncate">{user?.name || user?.email}</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setActiveTab(link.id);
                    if (link.id === 'chat') markClientChatRead();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-[#E8E4DA] text-[#1A2118] font-bold shadow-none'
                      : 'text-[#6B7265] hover:text-[#1A2118] hover:bg-[#EFECE5] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#1A2118]' : 'text-[#7D8876]'}`} />
                    <span>{link.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {link.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#5E734F] text-white font-mono text-[10px] font-bold">
                        {link.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#1A2118]" />}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Utility: Direct Drive Vault Link */}
        {clientInfo?.brandKitDriveFolderId && (
          <div className="pt-6 border-t border-[#E7E2D7]">
            <a
              href={`https://drive.google.com/drive/folders/${clientInfo.brandKitDriveFolderId}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#F8F6F0] border border-[#E7E2D7] text-xs font-semibold text-[#3D4C33] transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#5E734F]" />
                <span>Drive Asset Vault</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#7D8876]" />
            </a>
          </div>
        )}
      </aside>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT */}
      {/* ======================================================== */}
      <main className="flex-1 min-w-0 p-3.5 sm:p-5 lg:p-8 space-y-6 sm:space-y-8 max-w-full overflow-x-hidden">
        {/* Top Header Row matching Concept 2 Mockup */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-[#E7E2D7]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A2118] capitalize">
              {activeTab === 'review' ? 'Review Stage' : activeTab === 'deliverables' ? 'All Deliverables' : activeTab === 'chat' ? 'Studio Direct Chat' : activeTab}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Agency Site Jump */}
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#666F60] hover:text-[#1A2118] hover:bg-white border border-transparent hover:border-[#DDD9D0] transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              Agency Site
            </Link>

            {/* Refresh */}
            <button
              onClick={fetchClientData}
              title="Refresh Data"
              className="p-2 rounded-full bg-white border border-[#E7E2D7] text-[#5A6354] hover:bg-[#F1EDE4] transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Studio Direct Chat Button in Top Bar */}
            <button
              onClick={() => {
                setActiveTab('chat');
                markClientChatRead();
              }}
              title="Studio Direct Chat"
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all shadow-sm ${
                activeTab === 'chat'
                  ? 'bg-[#1A2118] text-white border-[#1A2118]'
                  : 'bg-white border border-[#E7E2D7] text-[#1A2118] hover:bg-[#F1EDE4]'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'chat' ? 'text-white' : 'text-[#5E734F]'}`} />
              <span className="text-xs font-semibold hidden sm:inline">Studio Chat</span>
              {unreadChatCount > 0 && (
                <span className="bg-[#5E734F] text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shadow animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Interactive Notifications Button */}
            <button
              onClick={() => setShowNotificationPanel(true)}
              title="Activity Updates & Messages"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7E2D7] text-[#1A2118] hover:bg-[#F1EDE4] transition-all shadow-sm"
            >
              <Bell className="w-3.5 h-3.5 text-[#5E734F]" />
              <span className="text-xs font-semibold hidden sm:inline">Updates</span>
              {unreadNotificationsCount > 0 && (
                <span className="bg-[#8C2C2C] text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shadow animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Phone Notification Bar Status Pill / Enable Button */}
            {notificationPermission === 'granted' ? (
              <div className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDF2E9] border border-[#BAC8B0] text-[#3D4C33] text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#5E734F] animate-pulse" />
                <Smartphone className="w-3.5 h-3.5 text-[#5E734F]" />
                <span>Phone Alerts Active</span>
                <button
                  onClick={handleSendTestNotification}
                  disabled={isSendingTestNotif}
                  className="ml-1 text-[10px] font-bold text-[#5E734F] hover:underline"
                  title="Dispatch a test alert to your phone notification bar"
                >
                  {isSendingTestNotif ? 'Pinging...' : 'Test'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={isRequestingNotif}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#DDD9D0] hover:bg-[#F1EDE4] text-[#1A2118] text-xs font-semibold transition-all shadow-xs"
                title="Enable alerts in your phone status bar even when closed"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#5E734F]" />
                <span>{isRequestingNotif ? 'Enabling...' : 'Enable Phone Alerts'}</span>
              </button>
            )}

            {/* Review Status Pill */}
            {clientInfo?.status === 'HIBERNATED' ? (
              <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Work Complete / Archived</span>
              </div>
            ) : (
              <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF0E5] border border-[#CCD8C4] text-[#4A5D3E] text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-[#5E734F] animate-ping" />
                <span>{selectedVideo?.reviewType || 'Active Review'}</span>
              </div>
            )}

            {/* User Avatar Circle and Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E7E2D7]">
              <div className="w-8 h-8 rounded-full bg-[#5E734F] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'CL'}
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#666F60] hover:text-[#BD4848] hover:bg-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Phone Notification Bar Permission Banner */}
        {notificationPermission !== 'granted' && !dismissNotifBanner && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1A2118] via-[#2A3426] to-[#1A2118] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md border border-[#3D4C33] animate-fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#5E734F]/30 border border-[#BAC8B0]/30 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-[#BAC8B0] animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-white">Enable Phone Notification Bar Alerts</h3>
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#5E734F] text-white font-bold tracking-wider">
                    Instant Push
                  </span>
                </div>
                <p className="text-xs text-[#BAC8B0] mt-0.5 max-w-2xl leading-relaxed">
                  Receive instant alerts on your phone status tray for new chat messages from our team, scheduled shoots, video cuts ready for review, and invoices — even when this window is closed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                disabled={isRequestingNotif}
                onClick={handleEnableNotifications}
                className="px-4 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                {isRequestingNotif ? 'Requesting Permission...' : 'Allow Notification Bar'}
              </button>
              <button
                onClick={() => setDismissNotifBanner(true)}
                className="p-2 rounded-xl text-[#7D8876] hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Hibernated / Work Complete Notice Banner */}
        {clientInfo?.status === 'HIBERNATED' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 flex items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                <Archive className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <div className="text-xs font-bold tracking-tight text-amber-950 flex items-center gap-2">
                  <span>Project Concluded &bull; Work Complete</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-bold">
                    Archived Workspace
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Production for this account has been completed. All master video cuts, review feedback, invoices, and your Google Drive asset vault remain permanently accessible below.
                </p>
              </div>
            </div>
            {clientInfo?.brandKitDriveFolderId && (
              <a
                href={`https://drive.google.com/drive/folders/${clientInfo.brandKitDriveFolderId}`}
                target="_blank"
                rel="noreferrer"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors shrink-0 shadow-xs"
              >
                <Folder className="w-3.5 h-3.5 text-amber-700" />
                <span>Google Drive Vault</span>
                <ExternalLink className="w-3 h-3 text-amber-600" />
              </a>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: REVIEW STAGE (CONCEPT 2 SIDEBAR WORKSPACE) */}
        {/* ======================================================== */}
        {activeTab === 'review' && (
          <div className="space-y-8">
            {/* Top 3 Clean Metric Tiles matching Concept 2 Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Active Deliverables */}
              <div
                onClick={() => setActiveTab('deliverables')}
                className="bg-white p-6 rounded-2xl border border-[#E7E2D7] shadow-sm hover:border-[#BAC8B0] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[#7D8876]">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Deliverables</span>
                  <ChevronRight className="w-4 h-4 text-[#BAC8B0] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#1A2118]">{videos.length}</span>
                  <span className="text-xs font-medium text-[#7D8876]">Cuts Ready</span>
                </div>
              </div>

              {/* Review Window */}
              <div className="bg-white p-6 rounded-2xl border border-[#E7E2D7] shadow-sm group">
                <div className="flex items-center justify-between text-[#7D8876]">
                  <span className="text-xs font-semibold uppercase tracking-wider">Review Window</span>
                  <Clock className="w-4 h-4 text-[#5E734F]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#1A2118]">
                    {selectedVideo?.status === 'PENDING_REVIEW'
                      ? `${selectedVideo.remainingHours}h ${selectedVideo.remainingMinutes}m`
                      : 'Active'}
                  </span>
                  <span className="text-xs font-medium text-[#7D8876]">Countdown Window</span>
                </div>
              </div>

              {/* Invoiced in Rupees */}
              <div
                onClick={() => setActiveTab('invoices')}
                className="bg-white p-6 rounded-2xl border border-[#E7E2D7] shadow-sm hover:border-[#BAC8B0] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[#7D8876]">
                  <span className="text-xs font-semibold uppercase tracking-wider">Invoiced Billing</span>
                  <ChevronRight className="w-4 h-4 text-[#BAC8B0] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#1A2118]">
                    ₹{(dashboardData?.summary?.outstandingAmount ?? 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-medium text-[#7D8876]">Outstanding (INR)</span>
                </div>
              </div>
            </div>

            {/* Video Review Workspace Card (Concept 2 Center Stage) */}
            {selectedVideo && (
              <div className="bg-white p-6 rounded-2xl border border-[#E7E2D7] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-[#1A2118]">Video Review Workspace</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#EAF0E5] border border-[#CCD8C4] text-[#4A5D3E] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#5E734F]" />
                      {selectedVideo.status === 'PENDING_REVIEW'
                        ? `${selectedVideo.reviewType || 'Review Window'}: ${String(selectedVideo.remainingHours ?? 0).padStart(2, '0')}h ${String(selectedVideo.remainingMinutes ?? 0).padStart(2, '0')}m`
                        : 'Review Completed'}
                    </span>
                    <button
                      onClick={() => setVideoToDelete(selectedVideo)}
                      className="px-3 py-1 rounded-full text-xs font-bold border border-[#E8BDBD] bg-white hover:bg-[#FDF2F2] text-[#8C2C2C] flex items-center gap-1.5 transition-all shadow-sm"
                      title="Delete video cut from workspace"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#8C2C2C]" />
                      Delete Cut
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 items-center">
                  {/* Video Player */}
                  <div className="lg:col-span-7 aspect-video rounded-xl overflow-hidden bg-[#151A14] relative group shadow-inner flex items-center justify-center">
                    <video
                      key={selectedVideo.id}
                      controls
                      playsInline
                      preload="metadata"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                      src={resolveVideoUrl(selectedVideo.driveStreamUrl)}
                      onError={(e) => {
                        console.warn('Client video load warning, resolving to local cut:', e);
                        const fallback = '/uploads/videos/sample_hero_cut.mp4';
                        if (e.target.src !== window.location.origin + fallback) {
                          e.target.src = fallback;
                        }
                      }}
                    />
                  </div>

                  {/* Project Preview & Metadata */}
                  <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-[#1A2118]">Video Project Preview</h3>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-[#F0ECE4]">
                          <span className="text-[#7D8876]">Name:</span>
                          <span className="font-semibold text-[#1A2118] text-right truncate max-w-[180px]">{selectedVideo.title}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[#F0ECE4]">
                          <span className="text-[#7D8876]">Brand:</span>
                          <span className="font-semibold text-[#1A2118]">{clientInfo?.company || 'Client'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[#F0ECE4]">
                          <span className="text-[#7D8876]">Project:</span>
                          <span className="font-mono text-[#5A6354]">{selectedVideo.version} • {selectedVideo.shootTitle || 'Commercial'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-[#7D8876]">Status:</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            selectedVideo.status === 'APPROVED' || selectedVideo.status === 'AUTO_APPROVED'
                              ? 'bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]'
                              : selectedVideo.status === 'REVISION_REQUESTED'
                              ? 'bg-[#FDF2F2] text-[#8C2C2C] border border-[#E8BDBD]'
                              : 'bg-[#FEF9EE] text-[#8C5D1E] border border-[#F0D59D]'
                          }`}>
                            {selectedVideo.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2 Pill CTA Buttons matching Concept 2 Mockup */}
                    {selectedVideo.status === 'PENDING_REVIEW' ? (
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleApproveVideo(selectedVideo.id)}
                          className="flex-1 py-2.5 px-4 rounded-full bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-semibold shadow-sm transition-all text-center flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve Cut
                        </button>
                        <button
                          onClick={() => setShowRevisionModal(true)}
                          className="flex-1 py-2.5 px-4 rounded-full bg-white hover:bg-[#F3EFE7] border border-[#1A2118] text-[#1A2118] text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Request Revision
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#F8F6F0] border border-[#E7E2D7] text-xs text-[#5E734F] font-semibold text-center">
                        This cut has been finalized and deliverables are locked.
                      </div>
                    )}
                  </div>
                </div>

                {/* Revision Feedback Threads */}
                {selectedVideo.clientFeedback?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#E7E2D7] space-y-2">
                    <h4 className="text-xs font-bold text-[#1A2118] uppercase tracking-wider">
                      Revision Log
                    </h4>
                    <div className="space-y-2">
                      {selectedVideo.clientFeedback.map((fb, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D7] text-xs">
                          <div className="flex items-center justify-between text-[#666F60] text-[10px] font-mono mb-1">
                            <span>Timecode: <strong className="text-[#1A2118]">{fb.timecode}</strong></span>
                            <span>{new Date(fb.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-[#1A2118]">{fb.comment}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All Deliverables Quick Grid */}
            <div className="bg-white rounded-2xl border border-[#E7E2D7] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#E7E2D7] flex items-center justify-between">
                <h3 className="font-bold text-base text-[#1A2118]">Active Project Deliverables</h3>
                <button
                  onClick={() => setActiveTab('deliverables')}
                  className="text-xs font-semibold text-[#5E734F] hover:underline"
                >
                  View All Cuts &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F3EC] border-b border-[#E7E2D7] text-[#6B7265] font-semibold">
                    <tr>
                      <th className="p-4">Cut Title</th>
                      <th className="p-4">Version</th>
                      <th className="p-4">Review Deadline</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Review & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE5] text-[#2C3527]">
                    {videos.map((v) => (
                      <tr key={v.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="p-4 font-bold text-[#1A2118]">{v.title}</td>
                        <td className="p-4 font-mono text-[#5A6354]">{v.version}</td>
                        <td className="p-4 font-mono text-[#5A6354]">{new Date(v.approvalDeadline).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                            v.status === 'APPROVED' || v.status === 'AUTO_APPROVED'
                              ? 'bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]'
                              : 'bg-[#FEF9EE] text-[#8C5D1E] border border-[#F0D59D]'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => {
                                setSelectedVideo(v);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="text-xs font-bold text-[#5E734F] hover:underline"
                            >
                              Review &rarr;
                            </button>
                            <button
                              onClick={() => setVideoToDelete(v)}
                              className="text-xs font-bold text-[#8C2C2C] hover:underline flex items-center gap-1"
                              title="Delete video cut"
                            >
                              <Trash2 className="w-3 h-3 text-[#8C2C2C]" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: ALL CUTS (GALLERY PANEL FOR CLIENT) */}
        {/* ======================================================== */}
        {activeTab === 'deliverables' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map((v) => (
                <div key={v.id} className="glass-panel p-5 rounded-2xl border border-[#DDD9D0] bg-white shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-mono text-[#5E734F] font-bold">{v.version}</span>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        v.status === 'APPROVED' || v.status === 'AUTO_APPROVED'
                          ? 'bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]'
                          : v.status === 'REVISION_REQUESTED'
                          ? 'bg-[#FDF2F2] text-[#8C2C2C] border border-[#E8BDBD]'
                          : 'bg-[#FEF9EE] text-[#8C5D1E] border border-[#F0D59D]'
                      }`}>
                        {v.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#1A2118]">{v.title}</h3>
                    <div className="text-xs text-[#666F60] mt-1 font-mono">
                      {v.reviewType || 'Client Review'} Deadline: {new Date(v.approvalDeadline).toLocaleString()}
                    </div>

                    {/* Inline Video Player Preview */}
                    <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-[#151A14] flex items-center justify-center">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        src={resolveVideoUrl(v.driveStreamUrl)}
                        onError={(e) => {
                          console.warn('Client cut preview load warning, resolving to local cut:', e);
                          const fallback = '/uploads/videos/sample_teaser_cut.mp4';
                          if (e.target.src !== window.location.origin + fallback) {
                            e.target.src = fallback;
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#DDD9D0] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedVideo(v);
                          setActiveTab('review');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-xs font-bold text-[#5E734F] hover:underline flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" /> Open in Review &rarr;
                      </button>
                      <button
                        onClick={() => setVideoToDelete(v)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E8BDBD] bg-white hover:bg-[#FDF2F2] text-[#8C2C2C] text-xs font-semibold transition-all shadow-sm"
                        title="Delete video cut"
                      >
                        <Trash2 className="w-3 h-3 text-[#8C2C2C]" />
                        Delete
                      </button>
                    </div>

                    <a
                      href={resolveVideoUrl(v.driveStreamUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#7D8876] hover:text-[#1A2118] font-mono"
                    >
                      Direct Link &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: SHOOTS */}
        {/* ======================================================== */}
        {activeTab === 'shoots' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {shoots.map((s) => (
              <div key={s.id} className="glass-panel p-5 rounded-2xl border border-[#DDD9D0] bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-[#5E734F] font-bold">{s.date}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0] font-bold">
                      {s.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#1A2118]">{s.title}</h3>
                  <div className="mt-3 space-y-1 text-xs text-[#5A6354]">
                    <div><span className="text-[#7D8876] font-semibold">Location:</span> {s.location}</div>
                    <div><span className="text-[#7D8876] font-semibold">Crew:</span> {s.crew}</div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#DDD9D0] text-[11px] text-[#666F60] italic">
                  {s.notes || 'Shoot production details logged.'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: INVOICES (RUPEES & DIGITAL INVOICE VIEWER) */}
        {/* ======================================================== */}
        {activeTab === 'invoices' && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-[#DDD9D0] bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F1EDE4] border-b border-[#DDD9D0] text-[#5A6354] font-semibold uppercase tracking-wider font-mono">
                <tr>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Work Scope / Description</th>
                  <th className="p-4">Amount (₹)</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">View Invoice</th>
                  <th className="p-4 text-right">Payment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD9D0]/60 text-[#2C3527]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F8F6F0] transition-colors">
                    <td className="p-4 font-mono font-bold text-[#1A2118]">{inv.invoiceNumber}</td>
                    <td className="p-4 max-w-xs text-[#5A6354] truncate" title={inv.description}>
                      {inv.description || 'Production Deliverables & Commercial License'}
                    </td>
                    <td className="p-4 font-mono font-bold text-[#1A2118]">
                      ₹{Number(inv.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 font-mono text-[#5A6354]">{inv.dueDate}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]'
                          : 'bg-[#FEF9EE] text-[#8C5D1E] border border-[#F0D59D]'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setViewingInvoice(inv)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F4F1EA] hover:bg-[#EAE5DA] text-[#1A2118] font-bold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#5E734F]" />
                        Inspect
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {inv.status === 'SENT' ? (
                          <button
                            onClick={() => handlePayInvoice(inv.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#5E734F] hover:bg-[#4E6240] text-white font-bold text-xs shadow-sm transition-all"
                          >
                            Settle Invoice
                          </button>
                        ) : (
                          <span className="text-xs text-[#3D4C33] font-mono font-bold flex items-center justify-end gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-[#5E734F]" />
                            Settled
                          </span>
                        )}
                        <button
                          onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#7D8876] hover:text-red-600 transition-colors"
                          title="Remove invoice from list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW: STUDIO CHAT (REAL-TIME CLIENT & STUDIO CHAT) */}
        {/* ======================================================== */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl border border-[#E7E2D7] shadow-sm overflow-hidden flex flex-col min-h-[640px]">
            {/* Chat Room Header */}
            <div className="p-4 border-b border-[#E7E2D7] bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img 
                  src="/app_icon.png" 
                  alt="zenvdigital" 
                  className="h-9 w-9 rounded-xl shadow-xs object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#1A2118]">Zenv Digital Production Studio</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF2E9] text-[#3D4C33] font-bold border border-[#BAC8B0]">
                      DIRECT CHANNEL
                    </span>
                  </div>
                  <div className="text-xs text-[#5A6354] flex items-center gap-2">
                    <span>Assigned Lead Editor & Colorist</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-[#4A5D3E] font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#5E734F] animate-pulse" />
                      Studio Team Active & Online
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {clientInfo?.brandKitDriveFolderId && (
                  <a
                    href={`https://drive.google.com/drive/folders/${clientInfo.brandKitDriveFolderId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl border border-[#BAC8B0] bg-white hover:bg-[#F3EFE7] text-[#3D4C33] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Folder className="w-3.5 h-3.5 text-[#5E734F]" />
                    Shared Assets Drive
                  </a>
                )}
                <button
                  onClick={fetchClientMessages}
                  className="p-1.5 rounded-xl border border-[#E7E2D7] bg-white text-[#5A6354] hover:bg-[#F1EDE4]"
                  title="Refresh Conversation"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages Scrollable Timeline */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[460px] min-h-[380px] bg-[#FAF9F6]">
              {chatMessages.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#7D8876] space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-[#BAC8B0]" />
                  <p className="font-bold text-[#1A2118]">No messages yet with the Studio Team</p>
                  <p>Send a message below to talk directly with your editors about cuts, color grade, audio or invoices.</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isClient = msg.senderRole === 'CLIENT';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-[#7D8876]">
                        <span className="font-semibold text-[#1A2118]">
                          {isClient ? 'You' : 'Zenv Digital Studio'}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                            isClient
                              ? 'bg-[#FEF9EE] text-[#8C5D1E] border border-[#F0D59D]'
                              : 'bg-[#EAF0E5] text-[#3D4C33] border border-[#CCD8C4]'
                          }`}
                        >
                          {isClient ? 'CLIENT' : 'STUDIO'}
                        </span>
                      </div>

                      <div
                        className={`max-w-md rounded-2xl p-4 shadow-sm text-xs space-y-2 ${
                          isClient
                            ? 'bg-[#1A2118] text-white border border-[#2D382A]'
                            : 'bg-white text-[#1A2118] border border-[#DDD9D0]'
                        }`}
                      >
                        {/* Tags & Timecode Header if available */}
                        {(msg.tag || msg.timecode) && (
                          <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-white/10">
                            {msg.tag && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                                  msg.tag === 'COLOR_GRADE'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : msg.tag === 'REVISION'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : msg.tag === 'DELIVERY'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : msg.tag === 'INVOICE'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-stone-500/20 text-stone-300 border border-stone-500/30'
                                }`}
                              >
                                {msg.tag}
                              </span>
                            )}
                            {msg.timecode && (
                              <span
                                onClick={() => {
                                  setActionSuccessNotice(`Timecode reference: ${msg.timecode}`);
                                  setTimeout(() => setActionSuccessNotice(null), 3000);
                                }}
                                className="cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EAF0E5] text-[#3D4C33] border border-[#CCD8C4] flex items-center gap-1"
                                title="Click to view timecode reference"
                              >
                                <Clock className="w-3 h-3 text-[#5E734F]" />
                                {msg.timecode}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                        <div
                          className={`flex items-center justify-end text-[10px] font-mono pt-1 ${
                            isClient ? 'text-white/60' : 'text-[#7D8876]'
                          }`}
                        >
                          <span>{msg.isReadByAdmin ? '✓✓ Seen by Studio' : '✓ Delivered'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Reply Suggestions for Client */}
            <div className="px-4 py-2 border-t border-[#E7E2D7] bg-[#FAF8F5] flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-[10px] font-bold uppercase text-[#7D8876] shrink-0 mr-1">Quick Chips:</span>
              {[
                '👍 Looks great! Approved for master render',
                '🎨 Can we warm up the color grading slightly?',
                '⏱ Note logged at timestamp',
                '💳 Invoice payment has been transferred',
                '🔊 Please check audio dialogue balance'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setChatInputText(chip)}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-[#EDF2E9] text-[#2C3527] border border-[#DDD9D0] text-[11px] font-medium transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input & Toolbar */}
            <form onSubmit={handleSendClientMessage} className="p-4 border-t border-[#E7E2D7] bg-white space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Tag selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#7D8876] font-semibold text-[11px]">Category:</span>
                  <select
                    value={chatInputTag}
                    onChange={(e) => setChatInputTag(e.target.value)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[#FAF8F5] border border-[#DDD9D0] text-[#1A2118] font-semibold"
                  >
                    <option value="GENERAL">General Message</option>
                    <option value="COLOR_GRADE">🎨 Color Grade</option>
                    <option value="REVISION">✂️ Revision / Cut Note</option>
                    <option value="DELIVERY">🎬 Master Delivery</option>
                    <option value="INVOICE">💳 Billing / Payment</option>
                  </select>
                </div>

                {/* Timecode marker input */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#7D8876] font-semibold text-[11px]">Timecode (Optional):</span>
                  <input
                    type="text"
                    value={chatInputTimecode}
                    onChange={(e) => setChatInputTimecode(e.target.value)}
                    placeholder="e.g. 01:14"
                    className="w-24 px-2 py-1 rounded-lg text-xs bg-[#FAF8F5] border border-[#DDD9D0] font-mono text-[#1A2118]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder="Type a message to the studio post-production team... (Press Enter to Send)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#FAF8F5] text-xs text-[#1A2118] focus:outline-none focus:border-[#5E734F] focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInputText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSendingChat ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Revision Modal */}
      {showRevisionModal && selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/40 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-lg p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-bold text-[#1A2118] mb-2">Request Revisions on {selectedVideo.title}</h3>
            <p className="text-xs text-[#5A6354] mb-4">
              Enter specific timecodes and creative direction for our post-production editors.
            </p>
            <form onSubmit={handleSubmitRevision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Timecode Marker (Optional)</label>
                <input
                  type="text"
                  value={revisionTimecode}
                  onChange={(e) => setRevisionTimecode(e.target.value)}
                  placeholder="e.g. 00:24 - 00:31"
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Creative Notes / Edit Directions</label>
                <textarea
                  required
                  rows={4}
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  placeholder="e.g. Please brighten the color grade on the product close-up."
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold"
                >
                  Dispatch Revisions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIGITAL INVOICE VIEWER MODAL (PROPERLY VIEWED BY CLIENT) */}
      {/* ======================================================== */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/50 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl p-5 sm:p-8 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl relative max-h-[92vh] overflow-y-auto my-auto">
            {/* Invoice Top Header */}
            <div className="flex items-start justify-between pb-6 border-b border-[#E7E2D7]">
              <div>
                <div className="flex items-center gap-3">
                  <img 
                    src="/app_icon.png" 
                    alt="zenvdigital" 
                    className="h-10 w-10 rounded-xl shadow-xs object-cover"
                  />
                  <div>
                    <span className="font-extrabold text-lg tracking-tight text-[#1A2118] block leading-tight">ZENV DIGITAL</span>
                    <span className="text-[10px] text-[#7D8876] font-mono uppercase font-semibold">Production Studio Master Invoicing</span>
                  </div>
                </div>
                <div className="text-[11px] text-[#7D8876] mt-1">
                  Creative Production Studio & Master Video Deliverables
                </div>
                <div className="text-[10px] text-[#7D8876] font-mono">
                  GSTIN / Tax ID: 27AABCZ9876K1Z4 • Mumbai / Global
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-extrabold text-[#1A2118] block">TAX INVOICE</span>
                <span className="font-mono text-xs font-bold text-[#5E734F]">{viewingInvoice.invoiceNumber}</span>
                <div className="mt-1">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    viewingInvoice.status === 'PAID'
                      ? 'bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]'
                      : 'bg-[#FEF9EE] text-[#8C5D1E] border border-[#F0D59D]'
                  }`}>
                    {viewingInvoice.status === 'PAID' ? 'SETTLED & PAID' : 'PENDING PAYMENT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Billed To & Dates */}
            <div className="grid grid-cols-2 gap-6 py-6 border-b border-[#E7E2D7] text-xs">
              <div>
                <span className="font-bold text-[#3D4C33] uppercase tracking-wider text-[11px] block mb-1">
                  Billed To
                </span>
                <div className="font-bold text-sm text-[#1A2118]">
                  {clientInfo?.company || viewingInvoice.clientId}
                </div>
                <div className="text-[#5A6354] mt-0.5">Contact: {user?.name || clientInfo?.name || 'Client'}</div>
                <div className="text-[#5A6354]">Email: {user?.email || clientInfo?.email || 'N/A'}</div>
              </div>

              <div className="space-y-1.5 text-right font-mono">
                <div>
                  <span className="text-[#7D8876]">Invoice Date: </span>
                  <span className="font-bold text-[#1A2118]">
                    {viewingInvoice.issueDate || '2026-10-22'}
                  </span>
                </div>
                <div>
                  <span className="text-[#7D8876]">Payment Due: </span>
                  <span className="font-bold text-[#8C2C2C]">{viewingInvoice.dueDate}</span>
                </div>
                <div>
                  <span className="text-[#7D8876]">Currency: </span>
                  <span className="font-bold text-[#1A2118]">INR (Indian Rupee - ₹)</span>
                </div>
              </div>
            </div>

            {/* Work Description Section */}
            <div className="py-6 border-b border-[#E7E2D7]">
              <span className="font-bold text-[#3D4C33] uppercase tracking-wider text-[11px] block mb-2">
                Work Scope & Deliverables
              </span>
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D7] text-xs text-[#1A2118] leading-relaxed">
                {viewingInvoice.description ||
                  'Full creative cinematography, lighting rig setup, multi-camera shoot direction, audio mastering, color grading, and commercial broadcast license.'}
              </div>
            </div>

            {/* Total Amount Table */}
            <div className="py-6 border-b border-[#E7E2D7]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E7E2D7] text-[#7D8876] font-semibold">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE5]">
                  <tr>
                    <td className="py-3 font-semibold text-[#1A2118]">
                      Production Shoot & Video Deliverables
                    </td>
                    <td className="py-3 text-right font-mono">1</td>
                    <td className="py-3 text-right font-mono font-bold text-[#1A2118]">
                      ₹{Number(viewingInvoice.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end pt-4">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-t border-[#E7E2D7] font-bold text-sm text-[#1A2118]">
                    <span>Total Due (INR):</span>
                    <span className="font-mono text-base text-[#5E734F]">
                      ₹{Number(viewingInvoice.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-[#DDD9D0] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A2118] flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save Receipt
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const toDel = viewingInvoice;
                    setViewingInvoice(null);
                    setInvoiceToDelete(toDel);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  Remove from list
                </button>
                {viewingInvoice.status === 'SENT' ? (
                  <button
                    type="button"
                    onClick={() => handlePayInvoice(viewingInvoice.id)}
                    className="px-5 py-2.5 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold shadow-md shadow-[#5E734F]/20 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Settle Invoice (₹{Number(viewingInvoice.amount).toLocaleString('en-IN')})
                  </button>
                ) : (
                  <span className="px-4 py-2 rounded-xl bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0] text-xs font-bold font-mono">
                    ✓ Paid & Reconciled
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NOTIFICATION PANEL SLIDE-OVER DRAWER (CLIENT) */}
      {/* ======================================================== */}
      {showNotificationPanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#FDFBF7] h-full shadow-2xl border-l border-[#E7E2D7] flex flex-col justify-between">
            {/* Header */}
            <div className="p-5 border-b border-[#E7E2D7] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF0E5] text-[#3D4C33] flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4 text-[#5E734F]" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1A2118]">Project Updates & Messages</h3>
                  <div className="text-[11px] text-[#7D8876]">
                    {unreadNotificationsCount} unread notification{unreadNotificationsCount === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={() => handleMarkNotificationRead(null)}
                    className="text-xs font-semibold text-[#5E734F] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotificationPanel(false)}
                  className="p-1.5 rounded-lg hover:bg-[#F1EDE4] text-[#5A6354]"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Phone Notification Bar Status Strip */}
            <div className="p-3 mx-4 mt-3 rounded-xl bg-[#F4F1EA] border border-[#DDD9D0] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#5E734F]" />
                <span className="font-semibold text-[#1A2118]">
                  Phone Status Bar: {notificationPermission === 'granted' ? 'Active' : 'Disabled'}
                </span>
              </div>
              {notificationPermission === 'granted' ? (
                <button
                  onClick={handleSendTestNotification}
                  disabled={isSendingTestNotif}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD9D0] text-[#3D4C33] font-bold text-[11px] hover:bg-[#EFECE5] shadow-xs"
                >
                  {isSendingTestNotif ? 'Sending...' : 'Test Alert'}
                </button>
              ) : (
                <button
                  onClick={handleEnableNotifications}
                  disabled={isRequestingNotif}
                  className="px-2.5 py-1 rounded-lg bg-[#5E734F] text-white font-bold text-[11px] hover:bg-[#4E6240]"
                >
                  {isRequestingNotif ? 'Enabling...' : 'Enable'}
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 px-4 pt-3 overflow-x-auto text-[11px] font-semibold">
              {['ALL', 'CHAT', 'SHOOT', 'VIDEO', 'INVOICE'].map((f) => (
                <button
                  key={f}
                  onClick={() => setNotifFilter(f)}
                  className={`px-2.5 py-1 rounded-full transition-colors ${
                    notifFilter === f
                      ? 'bg-[#1A2118] text-white'
                      : 'bg-[#EAE5DA] text-[#5A6354] hover:bg-[#DDD8CB]'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'CHAT' ? 'Chats' : f === 'SHOOT' ? 'Shoots' : f === 'VIDEO' ? 'Videos' : 'Invoices'}
                </button>
              ))}
            </div>

            {/* Notification List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {notifications
                .filter(n => notifFilter === 'ALL' || n.type === notifFilter || (notifFilter === 'VIDEO' && n.type === 'FEEDBACK'))
                .length === 0 ? (
                <div className="p-10 text-center text-[#7D8876] text-xs space-y-2">
                  <Bell className="w-8 h-8 mx-auto text-[#BAC8B0]" />
                  <p className="font-semibold">No notifications in this filter.</p>
                </div>
              ) : (
                notifications
                  .filter(n => notifFilter === 'ALL' || n.type === notifFilter || (notifFilter === 'VIDEO' && n.type === 'FEEDBACK'))
                  .map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) handleMarkNotificationRead(n.id);
                      if (n.actionTab) {
                        setActiveTab(n.actionTab);
                        setShowNotificationPanel(false);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      n.isRead
                        ? 'bg-white border-[#E7E2D7] opacity-80 hover:opacity-100'
                        : 'bg-white border-[#BAC8B0] shadow-sm ring-1 ring-[#5E734F]/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${n.isRead ? 'bg-[#D1CABE]' : 'bg-[#5E734F] animate-pulse'}`} />
                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#5E734F] px-2 py-0.5 rounded bg-[#EAF0E5]">
                          {n.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#7D8876] font-mono">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#1A2118] mt-2">{n.title}</h4>
                    <p className="text-xs text-[#5A6354] mt-1 leading-relaxed">{n.message}</p>

                    <div className="mt-3 pt-2 border-t border-[#F5F2EC] flex items-center justify-between text-[11px]">
                      <span className="text-[#5E734F] font-semibold hover:underline">
                        Jump to {n.actionTab || 'view'} &rarr;
                      </span>
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkNotificationRead(n.id);
                          }}
                          className="text-[#7D8876] hover:text-[#1A2118]"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E7E2D7] bg-white flex items-center justify-between text-xs text-[#7D8876]">
              <span>Real-time notifications enabled</span>
              <button
                onClick={() => setShowNotificationPanel(false)}
                className="px-4 py-1.5 rounded-lg bg-[#1A2118] text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CLIENT DELETE VIDEO CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {videoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/50 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-start justify-between gap-3 border-b border-[#E7E2D7] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FDF2F2] border border-[#E8BDBD] flex items-center justify-center text-[#8C2C2C]">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A2118]">Delete Deliverable Cut</h3>
                  <p className="text-xs text-[#7D8876]">Remove from your active deliverables</p>
                </div>
              </div>
              <button
                onClick={() => setVideoToDelete(null)}
                className="p-1 rounded-lg hover:bg-[#F3EFE7] text-[#7D8876]"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D7] text-xs space-y-1">
              <div className="font-bold text-[#1A2118] text-sm truncate">{videoToDelete.title}</div>
              <div className="text-[#5A6354] flex items-center gap-2 font-mono">
                <span className="text-[#5E734F] font-semibold">{videoToDelete.version || 'v1.0'}</span>
                <span>•</span>
                <span>{videoToDelete.shootTitle || 'Deliverable'}</span>
              </div>
            </div>

            <p className="text-xs text-[#5A6354] leading-relaxed">
              Are you sure you want to remove this video cut from your client deliverables vault? It will no longer appear in your active review workspace. If you ever need this cut reinstated, you can contact our studio team in chat.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setVideoToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingClientVideo}
                onClick={handleExecuteClientDelete}
                className="px-5 py-2 rounded-xl bg-[#8C2C2C] hover:bg-[#722323] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingClientVideo ? 'Deleting...' : 'Delete Video Cut'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CLIENT DELETE INVOICE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/50 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-start justify-between gap-3 border-b border-[#E7E2D7] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FDF2F2] border border-[#E8BDBD] flex items-center justify-center text-[#8C2C2C]">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A2118]">Remove Tax Invoice</h3>
                  <p className="text-xs text-[#7D8876]">Remove from your active invoices list</p>
                </div>
              </div>
              <button
                onClick={() => setInvoiceToDelete(null)}
                className="p-1 rounded-lg hover:bg-[#F3EFE7] text-[#7D8876]"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D7] text-xs space-y-1">
              <div className="font-bold text-[#1A2118] text-sm">Invoice #{invoiceToDelete.invoiceNumber}</div>
              <div className="text-[#5A6354] flex items-center gap-2 font-mono">
                <span className="text-[#5E734F] font-bold">₹{Number(invoiceToDelete.amount).toLocaleString('en-IN')}</span>
                <span>•</span>
                <span>Due: {invoiceToDelete.dueDate}</span>
                <span>•</span>
                <span className="uppercase">{invoiceToDelete.status}</span>
              </div>
              <p className="text-[#666F60] text-[11px] pt-1">{invoiceToDelete.description}</p>
            </div>

            <p className="text-xs text-[#5A6354] leading-relaxed">
              Are you sure you want to remove this invoice from your client portal view? If you ever need another digital copy, our accounts team can re-dispatch it to your email or chat anytime.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingInvoice}
                onClick={handleExecuteClientInvoiceDelete}
                className="px-5 py-2 rounded-xl bg-[#8C2C2C] hover:bg-[#722323] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingInvoice ? 'Removing...' : 'Remove Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Studio Chat Launcher (Quick access from any tab) */}
      {activeTab !== 'chat' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => {
              setActiveTab('chat');
              markClientChatRead();
            }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#1A2118] hover:bg-[#333D2F] text-white shadow-2xl border border-white/20 hover:scale-105 transition-all group"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#BD4848] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold tracking-wide">Studio Chat</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      )}
    </div>
  );
};
