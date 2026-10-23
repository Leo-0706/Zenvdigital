import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, Users, Film, DollarSign, Clock, AlertTriangle, CheckCircle,
  Plus, RefreshCw, Lock, Unlock, Play, Folder, Calendar, FileText, Send, PhoneCall,
  LayoutDashboard, Video, ChevronRight, Mail, Bell, Globe, LogOut, MoreHorizontal,
  ChevronDown, UploadCloud, Eye, Printer, Receipt, Check, Sparkles, Building,
  Key, Copy, ExternalLink, EyeOff, Trash2, MessageSquare, Tag, Hash, Search, UserMinus,
  Edit3, Archive, CheckCircle2, Smartphone, LayoutGrid, List, Menu, X
} from 'lucide-react';
import { notificationManager } from '../services/notificationManager';

export const AdminDashboard = () => {
  const { token, maintenanceMode, toggleMaintenance, user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [clients, setClients] = useState([]);
  const [shoots, setShoots] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [videos, setVideos] = useState([]);
  const [intrusionLogs, setIntrusionLogs] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [twilioHistory, setTwilioHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  // Selected video for preview workspace
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Client Profile Filter for Videos (Individual Client Data Isolation)
  const [selectedClientProfileId, setSelectedClientProfileId] = useState('ALL');

  // Digital Invoice Viewer Modal
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [showShootModal, setShowShootModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Form states
  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    password: 'ClientPass2026!',
    clientDriveEmail: ''
  });
  const [showNewClientPassword, setShowNewClientPassword] = useState(false);
  const [onboardedClientReceipt, setOnboardedClientReceipt] = useState(null);
  const [resetPasswordClient, setResetPasswordClient] = useState(null);
  const [adminResetPassValue, setAdminResetPassValue] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  // Client Management: Delete & Hibernate State
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [isTogglingHibernate, setIsTogglingHibernate] = useState(null);
  const [clientStatusFilter, setClientStatusFilter] = useState('ALL');
  const [clientViewMode, setClientViewMode] = useState('cards'); // 'cards' | 'table'

  const [newShoot, setNewShoot] = useState({ clientId: '', title: '', date: '', location: '', crew: '', notes: '' });
  const [editingShoot, setEditingShoot] = useState(null);
  const [shootToDelete, setShootToDelete] = useState(null);
  const [isUpdatingShoot, setIsUpdatingShoot] = useState(false);
  const [isDeletingShoot, setIsDeletingShoot] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    clientId: '',
    amount: '',
    dueDate: '',
    status: 'SENT',
    description: ''
  });
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Video Upload Form states (Local storage file upload support & manual project entry)
  const [newVideo, setNewVideo] = useState({
    clientId: '',
    shootId: '',
    title: '',
    version: 'v1.0',
    driveStreamUrl: '',
    reviewPreset: '48',
    reviewHours: 48,
    reviewType: 'Client Cut Review'
  });
  const [videoUploadMode, setVideoUploadMode] = useState('local'); // 'local' | 'url'
  const [localVideoFile, setLocalVideoFile] = useState(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Delete Video Modal State (Delete for Me vs Delete for Everyone)
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [deleteScopeSubmitting, setDeleteScopeSubmitting] = useState(false);

  // Studio Real-Time Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [activeChatClientId, setActiveChatClientId] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatInputText, setChatInputText] = useState('');
  const [chatInputTag, setChatInputTag] = useState('GENERAL');
  const [chatInputTimecode, setChatInputTimecode] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Notifications State (Interactive Notification Center & Phone Notification Bar)
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isRequestingNotif, setIsRequestingNotif] = useState(false);
  const [isSendingTestNotif, setIsSendingTestNotif] = useState(false);
  const [dismissNotifBanner, setDismissNotifBanner] = useState(false);
  const [notifFilter, setNotifFilter] = useState('ALL');

  // Client Device Popup Message State (Outbound Push to Client Phone)
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [popupTargetClient, setPopupTargetClient] = useState(null);
  const [popupTitle, setPopupTitle] = useState('🎬 Urgent Cut Review Required');
  const [popupMessage, setPopupMessage] = useState('We have uploaded the latest video cut for your immediate review and approval. Please review before the deadline.');
  const [popupActionTab, setPopupActionTab] = useState('review');
  const [popupUrgent, setPopupUrgent] = useState(true);
  const [isSendingPopup, setIsSendingPopup] = useState(false);
  const [popupResult, setPopupResult] = useState(null);
  const [clientDeviceStats, setClientDeviceStats] = useState({});



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
      const res = await fetch('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const notifData = await res.json();
        setNotifications(notifData.notifications || []);
        setUnreadNotificationsCount(notifData.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Error fetching admin notifications:', e);
    }
  };

  const fetchChatMessages = async (cId = null) => {
    const targetId = cId !== null ? cId : activeChatClientId;
    try {
      const url = targetId ? `/api/admin/messages?clientId=${targetId}` : '/api/admin/messages';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
        setUnreadChatCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Error fetching admin chat messages:', err);
    }
  };

  const handleSelectChatClient = async (cId) => {
    setActiveChatClientId(cId);
    fetchChatMessages(cId);
    try {
      await fetch('/api/admin/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clientId: cId })
      });
      fetchChatMessages(cId);
    } catch (e) {
      console.warn('Error marking messages read:', e);
    }
  };

  const handleSendAdminMessage = async (e) => {
    if (e) e.preventDefault();
    if (!activeChatClientId || !chatInputText.trim() || isSendingChat) return;
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientId: activeChatClientId,
          text: chatInputText.trim(),
          tag: chatInputTag,
          timecode: chatInputTimecode.trim() || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatInputText('');
        setChatInputTimecode('');
        fetchChatMessages(activeChatClientId);
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

  const handleExecuteDelete = async (scope) => {
    if (!videoToDelete) return;
    setDeleteScopeSubmitting(true);
    try {
      const res = await fetch(`/api/admin/videos/${videoToDelete.id}?scope=${scope}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ scope })
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
        showNotification(
          data.message || (
            scope === 'for_me'
              ? `Video "${videoToDelete.title}" hidden from your Studio Admin view.`
              : `Video "${videoToDelete.title}" permanently deleted across all portals.`
          )
        );
        if (selectedVideo?.id === videoToDelete.id) {
          setSelectedVideo(null);
        }
        setVideoToDelete(null);
        fetchData();
      } else {
        showNotification(data.message || data.error || 'Failed to delete video cut.', 'error');
      }
    } catch (err) {
      console.error('Delete video error:', err);
      showNotification(err.message || 'Network error while deleting video cut.', 'error');
    } finally {
      setDeleteScopeSubmitting(false);
    }
  };

  const handleMarkNotificationRead = async (notifId = null) => {
    try {
      const res = await fetch('/api/admin/notifications/mark-read', {
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [mRes, cRes, sRes, iRes, vRes, secRes, twRes, audRes, notifRes, devRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }),
        fetch('/api/admin/clients', { headers }),
        fetch('/api/admin/shoots', { headers }),
        fetch('/api/admin/invoices', { headers }),
        fetch('/api/admin/videos', { headers }),
        fetch('/api/admin/security/intrusion-logs', { headers }),
        fetch('/api/admin/automation/twilio-history', { headers }),
        fetch('/api/admin/security/audit-logs', { headers }),
        fetch('/api/admin/notifications', { headers }),
        fetch('/api/admin/clients/device-stats', { headers })
      ]);

      if (mRes.ok) setMetrics((await mRes.json()).metrics);
      if (cRes.ok) {
        const cData = await cRes.json();
        const loadedClients = cData.clients || [];
        setClients(loadedClients);
        if (loadedClients.length > 0) {
          setActiveChatClientId((prev) => prev || loadedClients[0].id);
        }
      }
      if (sRes.ok) setShoots((await sRes.json()).shoots);
      if (iRes.ok) setInvoices((await iRes.json()).invoices);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVideos(vData.videos || []);
        if (vData.videos?.length > 0 && !selectedVideo) {
          setSelectedVideo(vData.videos[0]);
        }
      }
      if (secRes.ok) {
        const secData = await secRes.json();
        setIntrusionLogs(secData.logs || []);
        setBlockedIps(secData.activeBlocks || []);
      }
      if (twRes.ok) setTwilioHistory((await twRes.json()).history || []);
      if (audRes.ok) setAuditLogs((await audRes.json()).logs || []);
      if (notifRes && notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
        setUnreadNotificationsCount(notifData.unreadCount || 0);
      }
      if (devRes && devRes.ok) {
        const devData = await devRes.json();
        setClientDeviceStats(devData.stats || {});
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
    setLoading(false);
  };

  const handleOpenPopupModal = (client = null) => {
    const target = client || (clients.length > 0 ? clients[0] : null);
    setPopupTargetClient(target);
    setPopupTitle('🎬 Urgent Cut Review Required');
    setPopupMessage(
      target
        ? `Hi ${target.company}, we have uploaded your latest 4K video cut for immediate review and approval. Please check your review vault before the deadline.`
        : 'We have uploaded the latest video cut for your review and approval.'
    );
    setPopupActionTab('review');
    setPopupUrgent(true);
    setPopupResult(null);
    setShowPopupModal(true);
  };

  const handleApplyPopupPreset = (presetKey) => {
    if (!popupTargetClient) return;
    const company = popupTargetClient.company || 'Client';
    switch (presetKey) {
      case 'CUT_READY':
        setPopupTitle('🎬 4K Video Cut Ready for Review');
        setPopupMessage(`Hi ${company}, we have uploaded your new 4K commercial cut to your private review vault. Please review and share your feedback.`);
        setPopupActionTab('review');
        break;
      case 'URGENT_DEADLINE':
        setPopupTitle('⏰ Urgent: Approval Deadline Approaching');
        setPopupMessage(`Urgent: The review window for your latest video deliverable is closing soon. Please review and approve to maintain scheduled delivery.`);
        setPopupActionTab('review');
        break;
      case 'SHOOT_UPDATE':
        setPopupTitle('📅 Shoot Call Sheet & Schedule Live');
        setPopupMessage(`The production schedule, crew call sheet, and location brief for your upcoming commercial shoot are now published in your portal.`);
        setPopupActionTab('shoots');
        break;
      case 'DIRECTOR_NOTE':
        setPopupTitle('💬 Studio Director Urgent Note');
        setPopupMessage(`The director has posted an urgent production note regarding your cut. Tap to open your studio chat thread.`);
        setPopupActionTab('chat');
        break;
      case 'INVOICE_READY':
        setPopupTitle('💳 Commercial Invoice Ready');
        setPopupMessage(`Your project milestone invoice is now available in your billing portal. Tap to review details and payment instructions.`);
        setPopupActionTab('invoices');
        break;
      default:
        break;
    }
  };

  const handleSendPopupMessage = async (e) => {
    if (e) e.preventDefault();
    if (!popupTargetClient || !popupMessage.trim() || isSendingPopup) return;

    setIsSendingPopup(true);
    setPopupResult(null);

    try {
      const res = await fetch(`/api/admin/clients/${popupTargetClient.id}/send-popup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: popupTitle.trim(),
          message: popupMessage.trim(),
          actionTab: popupActionTab,
          urgent: popupUrgent
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPopupResult({
          type: 'success',
          text: data.message,
          deliveredCount: data.deliveredCount,
          hasRegisteredDevices: data.hasRegisteredDevices
        });
        showNotification(data.message, 'success');
        fetchData();
      } else {
        setPopupResult({
          type: 'error',
          text: data.message || 'Failed to dispatch popup alert.'
        });
        showNotification(data.message || 'Error dispatching popup alert', 'error');
      }
    } catch (err) {
      setPopupResult({
        type: 'error',
        text: err.message || 'Network error while dispatching popup.'
      });
      showNotification('Error sending popup alert.', 'error');
    } finally {
      setIsSendingPopup(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      fetchChatMessages();
      // Auto-poll notifications & chat every 10 seconds so updates appear without refresh
      const pollTimer = setInterval(() => {
        fetchNotifications();
        fetchChatMessages();
      }, 10000);
      return () => clearInterval(pollTimer);
    }
  }, [token, activeChatClientId]);

  // Sync notification bar permission status
  useEffect(() => {
    if (notificationManager.isSupported()) {
      setNotificationPermission(notificationManager.getPermissionState());
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsRequestingNotif(true);
    try {
      const res = await notificationManager.requestPermission(token);
      setNotificationPermission(notificationManager.getPermissionState());
      if (res.success) {
        showNotification(res.message);
      } else {
        showNotification(res.message, 'warning');
      }
    } catch (e) {
      showNotification('Error enabling phone notifications.', 'error');
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
      showNotification('Error dispatching test alert.', 'error');
    } finally {
      setIsSendingTestNotif(false);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setFeedbackNotice({ msg, type });
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // Handlers
  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newClient)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Client ${data.client.company} onboarded! Login credentials & Drive created.`);
        setShowClientModal(false);
        setOnboardedClientReceipt(data);
        setNewClient({
          name: '',
          company: '',
          email: '',
          phone: '',
          password: 'ClientPass2026!',
          clientDriveEmail: ''
        });
        fetchData();
      } else {
        alert(data.message || 'Error creating client');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordClient || !adminResetPassValue) return;
    try {
      const res = await fetch(`/api/admin/clients/${resetPasswordClient.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: adminResetPassValue })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message);
        setResetPasswordClient(null);
        setAdminResetPassValue('');
      } else {
        alert(data.message || 'Error updating password');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleClientHibernate = async (client) => {
    const isCurrentlyHibernated = client.status === 'HIBERNATED';
    setIsTogglingHibernate(client.id);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/hibernate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ hibernate: !isCurrentlyHibernated })
      });
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try { data = JSON.parse(text); } catch { data = { success: res.ok, message: text }; }
      }
      if (res.ok && data.success !== false) {
        showNotification(
          isCurrentlyHibernated
            ? `Client "${client.company}" reactivated to Active Production.`
            : `Client "${client.company}" marked as Work Complete / Hibernated.`
        );
        fetchData();
      } else {
        showNotification(data.message || 'Failed to update client status.', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Network error updating client status.', 'error');
    } finally {
      setIsTogglingHibernate(null);
    }
  };

  const handleExecuteDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeletingClient(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientToDelete.id}`, {
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
        try { data = JSON.parse(text); } catch { data = { success: res.ok, message: text }; }
      }
      if (res.ok && data.success !== false) {
        showNotification(data.message || `Client "${clientToDelete.company}" permanently deleted.`);
        setClientToDelete(null);
        if (selectedClientProfileId === clientToDelete.id) {
          setSelectedClientProfileId('ALL');
        }
        fetchData();
      } else {
        showNotification(data.message || 'Failed to delete client account.', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Network error deleting client account.', 'error');
    } finally {
      setIsDeletingClient(false);
    }
  };

  const handleCopyText = (text, fieldKey) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleCreateShoot = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/shoots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newShoot)
      });
      if (res.ok) {
        showNotification('Shoot successfully scheduled.');
        setShowShootModal(false);
        setNewShoot({ clientId: '', title: '', date: '', location: '', crew: '', notes: '' });
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.message || 'Failed to schedule shoot.', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Error scheduling shoot.', 'error');
    }
  };

  const handleUpdateShoot = async (e) => {
    e.preventDefault();
    if (!editingShoot) return;
    setIsUpdatingShoot(true);
    try {
      const res = await fetch(`/api/admin/shoots/${editingShoot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingShoot)
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
        showNotification(`Shoot "${editingShoot.title}" updated successfully.`);
        setEditingShoot(null);
        fetchData();
      } else {
        showNotification(data.message || data.error || 'Failed to update shoot schedule.', 'error');
      }
    } catch (err) {
      console.error('Update shoot error:', err);
      showNotification(err.message || 'Network error updating shoot schedule.', 'error');
    } finally {
      setIsUpdatingShoot(false);
    }
  };

  const handleExecuteDeleteShoot = async () => {
    if (!shootToDelete) return;
    setIsDeletingShoot(true);
    try {
      const res = await fetch(`/api/admin/shoots/${shootToDelete.id}`, {
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
        showNotification(data.message || `Shoot "${shootToDelete.title}" deleted.`);
        setShootToDelete(null);
        fetchData();
      } else {
        showNotification(data.message || data.error || 'Failed to delete shoot schedule.', 'error');
      }
    } catch (err) {
      console.error('Delete shoot error:', err);
      showNotification(err.message || 'Network error deleting shoot schedule.', 'error');
    } finally {
      setIsDeletingShoot(false);
    }
  };

  const handleExecuteDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeletingInvoice(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceToDelete.id}`, {
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
        showNotification(data.message || `Invoice #${invoiceToDelete.invoiceNumber} deleted.`);
        if (viewingInvoice?.id === invoiceToDelete.id) {
          setViewingInvoice(null);
        }
        setInvoiceToDelete(null);
        fetchData();
      } else {
        showNotification(data.message || data.error || 'Failed to delete invoice.', 'error');
      }
    } catch (err) {
      console.error('Delete invoice error:', err);
      showNotification(err.message || 'Network error deleting invoice.', 'error');
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newInvoice)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`Invoice #${data.invoice?.invoiceNumber || ''} issued.`);
        setShowInvoiceModal(false);
        // Automatically open the invoice in the Digital Invoice Viewer so it can be seen immediately
        if (data.invoice) {
          setViewingInvoice(data.invoice);
        }
        setNewInvoice({ clientId: '', amount: '', dueDate: '', status: 'SENT', description: '' });
        fetchData();
      } else {
        alert(data.message || 'Error issuing invoice');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateVideo = async (e) => {
    e.preventDefault();
    setIsUploadingVideo(true);

    try {
      let res;
      if (videoUploadMode === 'local' && localVideoFile) {
        const formData = new FormData();
        formData.append('videoFile', localVideoFile);
        formData.append('clientId', newVideo.clientId);
        formData.append('shootId', newVideo.shootId);
        formData.append('shootProject', newVideo.shootId);
        formData.append('title', newVideo.title);
        formData.append('version', newVideo.version);
        formData.append('reviewType', newVideo.reviewType || 'Client Cut Review');
        formData.append('reviewHours', newVideo.reviewHours || 48);

        res = await fetch('/api/admin/videos', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      } else {
        res = await fetch('/api/admin/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            ...newVideo,
            shootProject: newVideo.shootId,
            reviewType: newVideo.reviewType || 'Client Cut Review',
            reviewHours: newVideo.reviewHours || 48
          })
        });
      }

      const data = await res.json();
      if (res.ok) {
        showNotification(`Video "${newVideo.title}" uploaded! ${newVideo.reviewType} window is active.`);
        setShowVideoModal(false);
        setNewVideo({
          clientId: '',
          shootId: '',
          title: '',
          version: 'v1.0',
          driveStreamUrl: '',
          reviewPreset: '48',
          reviewHours: 48,
          reviewType: 'Client Cut Review'
        });
        setLocalVideoFile(null);
        fetchData();
      } else {
        alert(data.message || 'Error uploading video');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleTriggerAutoApprovals = async () => {
    try {
      const res = await fetch('/api/admin/automation/trigger-auto-approvals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      showNotification(`Review deadlines checked. Auto-Approved: ${data.result?.autoApproved?.length || 0}`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTriggerPaymentReminders = async () => {
    try {
      const res = await fetch('/api/admin/automation/trigger-payment-reminders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      showNotification(`₹ Payment reminders sent for ${data.result?.remindersSent?.length || 0} invoice(s).`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnblockIp = async (ip) => {
    try {
      const res = await fetch('/api/admin/security/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ip })
      });
      if (res.ok) {
        showNotification(`IP ${ip} unblocked.`);
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };


  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarLinks = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'chat', label: 'Studio Chat', icon: MessageSquare, badge: unreadChatCount },
    { id: 'shoots', label: 'Shoots', icon: Calendar },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  // Filtered videos based on selected client profile
  const filteredVideos = selectedClientProfileId === 'ALL'
    ? videos
    : videos.filter(v => v.clientId === selectedClientProfileId);

  const selectedClientObject = clients.find(c => c.id === selectedClientProfileId);

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#1A2118] flex flex-col lg:flex-row w-full max-w-full overflow-x-hidden">
      {/* Toast Notice */}
      {feedbackNotice && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border bg-white text-xs font-semibold shadow-xl flex items-center gap-2 transition-all ${
          (typeof feedbackNotice === 'object' && feedbackNotice.type === 'error')
            ? 'border-red-300 text-red-800'
            : 'border-[#BAC8B0] text-[#3D4C33]'
        }`}>
          {(typeof feedbackNotice === 'object' && feedbackNotice.type === 'error') ? (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-[#5E734F] shrink-0" />
          )}
          <span>{typeof feedbackNotice === 'object' ? feedbackNotice.msg : feedbackNotice}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* MOBILE APP BAR & QUICK-NAV (concept for mobile/tablet)   */}
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
            <span className="text-[10px] text-[#7D8876] font-mono uppercase font-semibold">Admin</span>
          </Link>

          <div className="flex items-center gap-1.5">
            {/* Quick Chat icon with badge */}
            <button
              onClick={() => {
                setActiveTab('chat');
                if (activeChatClientId) handleSelectChatClient(activeChatClientId);
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
              aria-label="Studio Notifications"
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
                key={`mobile-tab-${link.id}`}
                onClick={() => {
                  setActiveTab(link.id);
                  if (link.id === 'chat' && activeChatClientId) {
                    handleSelectChatClient(activeChatClientId);
                  }
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
                  <span className="text-[10px] font-mono text-[#7D8876] uppercase font-semibold">Admin</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#5A6354] hover:bg-[#EAE5DA]"
                >
                  <X className="w-4 h-4" />
                </button>
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
                        if (link.id === 'chat' && activeChatClientId) {
                          handleSelectChatClient(activeChatClientId);
                        }
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
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E7E2D7] shadow-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#5E734F]" />
                  <div className="text-xs">
                    <div className="font-bold text-[#1A2118]">Maintenance Mode</div>
                    <div className="text-[10px] text-[#7D8876]">503 Service Barrier</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleMaintenance(!maintenanceMode)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    maintenanceMode
                      ? 'bg-[#FDF2F2] border-[#E8BDBD] text-[#8C2C2C]'
                      : 'bg-[#EDF2E9] border-[#BAC8B0] text-[#3D4C33]'
                  }`}
                >
                  {maintenanceMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E7E2D7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1A2118] text-white flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'BN'}
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-[#1A2118] truncate max-w-[130px]">{user?.name || 'Admin'}</div>
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
          {/* Studio Brand (Merged seamlessly with background) */}
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
                  <div className="text-[10px] text-[#7D8876] font-mono uppercase font-semibold">Studio Admin</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-[10px] text-[#7D8876] font-mono uppercase font-semibold">Admin Console</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5E734F] animate-pulse" />
              </div>
            </Link>
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
                    if (link.id === 'chat' && activeChatClientId) {
                      handleSelectChatClient(activeChatClientId);
                    }
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

        {/* Bottom Sidebar Utility */}
        <div className="pt-6 border-t border-[#E7E2D7] space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E7E2D7] shadow-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#5E734F]" />
              <div className="text-xs">
                <div className="font-bold text-[#1A2118]">Maintenance Mode</div>
                <div className="text-[10px] text-[#7D8876]">503 Service Barrier</div>
              </div>
            </div>
            <button
              onClick={() => toggleMaintenance(!maintenanceMode)}
              className={`p-1.5 rounded-lg border transition-colors ${
                maintenanceMode
                  ? 'bg-[#FDF2F2] border-[#E8BDBD] text-[#8C2C2C]'
                  : 'bg-[#EDF2E9] border-[#BAC8B0] text-[#3D4C33]'
              }`}
            >
              {maintenanceMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT */}
      {/* ======================================================== */}
      <main className="flex-1 min-w-0 p-3.5 sm:p-5 lg:p-8 space-y-6 sm:space-y-8 max-w-full overflow-x-hidden">
        {/* Top Header Row matching Concept 2 Mockup */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-[#E7E2D7]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A2118] capitalize">
              {activeTab === 'chat' ? 'Studio Direct Chat' : activeTab}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Action buttons depending on tab */}
            {activeTab === 'shoots' && (
              <button
                onClick={() => setShowShootModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule Shoot
              </button>
            )}

            {activeTab === 'videos' && (
              <button
                onClick={() => setShowVideoModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-semibold shadow-sm transition-all"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload Cut (Local / URL)
              </button>
            )}

            {activeTab === 'invoices' && (
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Issue Invoice
              </button>
            )}

            {activeTab === 'clients' && (
              <button
                onClick={() => setShowClientModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Onboard Client
              </button>
            )}

            {/* Studio Direct Chat Button in Top Bar */}
            <button
              onClick={() => {
                setActiveTab('chat');
                if (activeChatClientId) handleSelectChatClient(activeChatClientId);
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



            {/* Refresh */}
            <button
              onClick={fetchData}
              title="Refresh Data"
              className="p-2 rounded-full bg-white border border-[#E7E2D7] text-[#5A6354] hover:bg-[#F1EDE4] transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Interactive Notifications Button */}
            <button
              onClick={() => setShowNotificationPanel(true)}
              title="Studio Activity & Notifications"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7E2D7] text-[#1A2118] hover:bg-[#F1EDE4] transition-all shadow-sm"
            >
              <Bell className="w-3.5 h-3.5 text-[#5E734F]" />
              <span className="text-xs font-semibold hidden sm:inline">Notifications</span>
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

            {/* User Avatar Circle and Admin Identity */}
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-[#E7E2D7]">
              <div className="w-8 h-8 rounded-full bg-[#1A2118] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'BN'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-[#1A2118] leading-tight">
                  {user?.name || 'Bibek Bisal Nayak'}
                </span>
                <span className="text-[10px] text-[#7D8876] font-mono leading-tight">
                  {user?.email || 'Bibekbisalnayak@gmail.com'}
                </span>
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
                    Real-Time Web Push
                  </span>
                </div>
                <p className="text-xs text-[#BAC8B0] mt-0.5 max-w-2xl leading-relaxed">
                  Show instant notifications in your phone status tray for client chat messages, video review approvals, shoot bookings, and payment settlements — even when the browser or app is closed.
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

        {/* ======================================================== */}
        {/* VIEW 1: OVERVIEW (CONCEPT 2 SIDEBAR WORKSPACE) */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Top 3 Clean Metric Tiles matching Concept 2 Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Active Projects */}
              <div
                onClick={() => setActiveTab('shoots')}
                className="bg-white p-6 rounded-2xl border border-[#E7E2D7] shadow-sm hover:border-[#BAC8B0] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[#7D8876]">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
                  <ChevronRight className="w-4 h-4 text-[#BAC8B0] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#1A2118]">{shoots.length || 0}</span>
                  <span className="text-xs font-medium text-[#7D8876]">Production Shoots</span>
                </div>
              </div>

              {/* Review Deliverables */}
              <div
                onClick={() => setActiveTab('videos')}
                className="bg-white p-6 rounded-2xl border border-[#E7E2D7] shadow-sm hover:border-[#BAC8B0] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[#7D8876]">
                  <span className="text-xs font-semibold uppercase tracking-wider">Pending Review</span>
                  <ChevronRight className="w-4 h-4 text-[#BAC8B0] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#1A2118]">
                    {videos.filter(v => v.status === 'PENDING_REVIEW').length}
                  </span>
                  <span className="text-xs font-medium text-[#7D8876]">
                    Review Deliverables
                  </span>
                </div>
              </div>

              {/* Invoiced in Rupees */}
              <div
                onClick={() => setActiveTab('invoices')}
                className="bg-white p-6 rounded-2xl border border-[#E7E2D7] shadow-sm hover:border-[#BAC8B0] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[#7D8876]">
                  <span className="text-xs font-semibold uppercase tracking-wider">Invoiced Revenue</span>
                  <ChevronRight className="w-4 h-4 text-[#BAC8B0] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#1A2118]">
                    ₹{(metrics?.totalRevenue ?? 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-medium text-[#7D8876]">INR Collected</span>
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
                      {selectedVideo.reviewType || 'Client Review'} Countdown Active
                    </span>
                    <button
                      onClick={() => setVideoToDelete(selectedVideo)}
                      className="px-3 py-1 rounded-full text-xs font-bold border border-[#E8BDBD] bg-white hover:bg-[#FDF2F2] text-[#8C2C2C] flex items-center gap-1.5 transition-all shadow-sm"
                      title="Delete video deliverable cut"
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
                        console.warn('Admin video load warning, resolving to local cut:', e);
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
                          <span className="text-[#7D8876]">Client Profile:</span>
                          <span className="font-semibold text-[#1A2118]">{selectedVideo.client?.company || selectedVideo.clientId}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[#F0ECE4]">
                          <span className="text-[#7D8876]">Project / Version:</span>
                          <span className="font-mono text-[#5A6354]">{selectedVideo.version} • {selectedVideo.shoot?.title || 'Commercial'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-[#7D8876]">Status:</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]">
                            {selectedVideo.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleTriggerAutoApprovals}
                        className="flex-1 py-2.5 px-3 rounded-full bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-semibold shadow-sm transition-all text-center"
                      >
                        Approve Cut
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClientProfileId(selectedVideo.clientId);
                          setActiveTab('videos');
                        }}
                        className="flex-1 py-2.5 px-3 rounded-full bg-white hover:bg-[#F3EFE7] border border-[#1A2118] text-[#1A2118] text-xs font-semibold transition-all text-center"
                      >
                        Inspect Vault
                      </button>
                      <button
                        onClick={() => setVideoToDelete(selectedVideo)}
                        className="py-2.5 px-3 rounded-full border border-[#E8BDBD] bg-white hover:bg-[#FDF2F2] text-[#8C2C2C] text-xs font-semibold transition-all text-center flex items-center justify-center gap-1"
                        title="Delete video cut"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#8C2C2C]" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Video Review Workspace Empty State when no video cuts exist */}
            {!selectedVideo && (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-[#DDD9D0] text-center space-y-2">
                <Video className="w-8 h-8 text-[#BAC8B0] mx-auto" />
                <h3 className="text-sm font-bold text-[#1A2118]">No Active Video Review Cuts</h3>
                <p className="text-xs text-[#7D8876] max-w-sm mx-auto">
                  When video cuts are uploaded for client review, the live countdown player and timecode review workspace will appear here.
                </p>
              </div>
            )}

            {/* Upcoming Shoot Schedule (Concept 2 Minimal Table) */}
            <div className="bg-white rounded-2xl border border-[#E7E2D7] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#E7E2D7] flex items-center justify-between">
                <h3 className="font-bold text-base text-[#1A2118]">Upcoming Shoot Schedule</h3>
                <button
                  onClick={() => setShowShootModal(true)}
                  className="text-xs font-semibold text-[#5E734F] hover:underline"
                >
                  + Add Shoot
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F3EC] border-b border-[#E7E2D7] text-[#6B7265] font-semibold">
                    <tr>
                      <th className="p-4">Project</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Scheduled Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE5] text-[#2C3527]">
                    {shoots.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-[#7D8876]">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Film className="w-6 h-6 text-[#BAC8B0]" />
                            <span className="font-semibold text-xs text-[#1A2118]">No upcoming shoots scheduled</span>
                            <span className="text-[11px] text-[#7D8876]">Schedule production shoots to coordinate call sheets and crew.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      shoots.slice(0, 4).map((s) => (
                      <tr key={s.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#1A2118]">{s.title}</div>
                          <div className="text-[11px] text-[#7D8876]">{s.client?.company || s.clientId}</div>
                        </td>
                        <td className="p-4 text-[#5A6354] font-medium">{s.date}</td>
                        <td className="p-4 text-[#5A6354]">{s.location || 'Studio Set'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                            s.status === 'COMPLETED' ? 'bg-[#EDF2E9] text-[#3D4C33] border-[#BAC8B0]' :
                            s.status === 'IN_PRODUCTION' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            s.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-[#F6F3EC] text-[#5A6354] border-[#DDD9D0]'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingShoot(s)}
                              className="p-1.5 text-[#5A6354] hover:text-[#5E734F] hover:bg-[#EDF2E9] rounded-lg transition-colors"
                              title="Edit shoot details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShootToDelete(s)}
                              className="p-1.5 text-[#8C2C2C] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete shoot schedule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: SHOOTS */}
        {/* ======================================================== */}
        {activeTab === 'shoots' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E7E2D7] shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-[#1A2118] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#5E734F]" />
                  Production Shoot Schedules
                </h2>
                <p className="text-xs text-[#6B7265] mt-0.5">
                  Coordinate call sheets, locations, crew assignments, and modify or delete scheduled shoot dates.
                </p>
              </div>
              <button
                onClick={() => setShowShootModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                Schedule New Shoot
              </button>
            </div>

            {shoots.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#DDD9D0] p-12 text-center">
                <Calendar className="w-10 h-10 text-[#BAC8B0] mx-auto mb-3" />
                <h3 className="font-bold text-[#1A2118] text-sm">No Shoots Scheduled</h3>
                <p className="text-xs text-[#7D8876] mt-1 mb-4">You have not scheduled any upcoming production shoots yet.</p>
                <button
                  onClick={() => setShowShootModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#5E734F] text-white text-xs font-bold"
                >
                  Schedule First Shoot
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {shoots.map((s) => (
                  <div key={s.id} className="glass-panel p-5 rounded-2xl border border-[#DDD9D0] bg-white shadow-sm flex flex-col justify-between hover:border-[#BAC8B0] transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-mono text-[#5E734F] font-bold truncate max-w-[160px]">
                          {s.client?.company || s.clientId}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${
                          s.status === 'COMPLETED' ? 'bg-[#EDF2E9] text-[#3D4C33] border-[#BAC8B0]' :
                          s.status === 'IN_PRODUCTION' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          s.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-[#F6F3EC] text-[#5A6354] border-[#DDD9D0]'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-[#1A2118]">{s.title}</h3>
                      <div className="mt-3 space-y-1.5 text-xs text-[#5A6354]">
                        <div><span className="text-[#7D8876] font-semibold">Date:</span> {s.date}</div>
                        <div><span className="text-[#7D8876] font-semibold">Location:</span> {s.location || 'Studio Set'}</div>
                        <div><span className="text-[#7D8876] font-semibold">Crew:</span> {s.crew || 'Unassigned'}</div>
                      </div>
                    </div>
                    <div>
                      <div className="mt-4 pt-3 border-t border-[#DDD9D0] text-[11px] text-[#666F60] italic line-clamp-2">
                        {s.notes || 'Production shoot notes logged.'}
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#EFECE5] flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingShoot(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD9D0] hover:border-[#5E734F] bg-white hover:bg-[#F9F8F5] text-xs font-semibold text-[#3D4C33] transition-all shadow-xs"
                          title="Edit shoot details"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#5E734F]" />
                          Edit
                        </button>
                        <button
                          onClick={() => setShootToDelete(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8BDBD] hover:border-red-500 bg-white hover:bg-red-50 text-xs font-semibold text-[#8C2C2C] transition-all shadow-xs"
                          title="Delete shoot schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#8C2C2C]" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: VIDEOS (CLIENT PROFILE VAULT SEPARATION) */}
        {/* ======================================================== */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            {/* Client Profile Vault Selector Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#E7E2D7] shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3D4C33] uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#5E734F]" />
                  Filter Deliverables by Individual Client Profile
                </span>
                <span className="text-xs text-[#7D8876]">
                  Data is strictly isolated per client profile
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => setSelectedClientProfileId('ALL')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedClientProfileId === 'ALL'
                      ? 'bg-[#1A2118] text-white shadow-sm'
                      : 'bg-[#F4F1EA] text-[#5A6354] hover:bg-[#EAE5DA] hover:text-[#1A2118]'
                  }`}
                >
                  All Clients ({videos.length})
                </button>

                {clients.map((c) => {
                  const clientVideoCount = videos.filter(v => v.clientId === c.id).length;
                  const isSelected = selectedClientProfileId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClientProfileId(c.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#5E734F] text-white shadow-sm'
                          : 'bg-[#F4F1EA] text-[#5A6354] hover:bg-[#EAE5DA] hover:text-[#1A2118]'
                      }`}
                    >
                      <span>{c.company}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#E7E2D7] text-[#3D4C33]'
                      }`}>
                        {clientVideoCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Individual Client Profile Header Card (Shown when specific client selected) */}
            {selectedClientObject && (
              <div className="p-5 rounded-2xl bg-[#F7F5EF] border border-[#DDD9D0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#1A2118]">{selectedClientObject.company}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF2E9] text-[#3D4C33] font-bold border border-[#BAC8B0]">
                      CLIENT ID: {selectedClientObject.id}
                    </span>
                  </div>
                  <div className="text-xs text-[#5A6354] mt-1 space-x-3">
                    <span>Contact: <strong>{selectedClientObject.name}</strong></span>
                    <span>•</span>
                    <span>Email: <strong>{selectedClientObject.email}</strong></span>
                    <span>•</span>
                    <span>Phone: <strong>{selectedClientObject.phone || 'N/A'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setNewVideo({ ...newVideo, clientId: selectedClientObject.id });
                      setShowVideoModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload Cut for {selectedClientObject.company}
                  </button>
                </div>
              </div>
            )}

            {/* Empty State for client with 0 videos */}
            {filteredVideos.length === 0 && (
              <div className="p-12 text-center bg-white rounded-2xl border border-[#DDD9D0] space-y-3">
                <Video className="w-8 h-8 text-[#A0A89C] mx-auto" />
                <h3 className="text-sm font-bold text-[#1A2118]">No video deliverables found for this client</h3>
                <p className="text-xs text-[#5A6354] max-w-sm mx-auto">
                  Upload a local video file from your computer or supply a stream URL to start the review countdown.
                </p>
                <button
                  onClick={() => {
                    if (selectedClientObject) setNewVideo({ ...newVideo, clientId: selectedClientObject.id });
                    setShowVideoModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-bold transition-all mt-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload First Cut
                </button>
              </div>
            )}

            {/* Video Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredVideos.map((v) => (
                <div key={v.id} className="glass-panel p-5 rounded-2xl border border-[#DDD9D0] bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-mono text-[#5E734F] font-bold">
                        {v.version} • {v.client?.company || v.clientId}
                      </span>
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
                    <p className="text-xs text-[#666F60] mt-1 font-medium">
                      Project: <span className="font-semibold text-[#1A2118]">{v.shoot?.title || v.projectName || v.shootId}</span>
                    </p>

                    {/* Inline Video Player Preview in Deliverables Card */}
                    <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-[#151A14] flex items-center justify-center">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        src={resolveVideoUrl(v.driveStreamUrl)}
                        onError={(e) => {
                          const fallback = '/uploads/videos/sample_hero_cut.mp4';
                          if (e.target.src !== window.location.origin + fallback) {
                            e.target.src = fallback;
                          }
                        }}
                      />
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-[#F8F6F0] border border-[#DDD9D0] text-xs font-mono space-y-1">
                      <div className="text-[#666F60]">Uploaded: {new Date(v.uploadTimestamp).toLocaleString()}</div>
                      <div className="text-[#A6732B] font-bold">
                        {v.reviewType || 'Client Review'} Deadline: {new Date(v.approvalDeadline).toLocaleString()}
                      </div>
                    </div>

                    {/* Show Client Feedback comments if any */}
                    {v.clientFeedback?.length > 0 && (
                      <div className="mt-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2D7] text-xs space-y-1">
                        <span className="font-bold text-[#1A2118] text-[11px] block">Client Revision Notes:</span>
                        {v.clientFeedback.map((fb, idx) => (
                          <div key={idx} className="text-[#5A6354] text-[11px]">
                            [{fb.timecode}] "{fb.comment}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#DDD9D0] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedVideo(v);
                          setActiveTab('overview');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Preview in Workspace
                      </button>

                      <button
                        onClick={() => setVideoToDelete(v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8BDBD] bg-white hover:bg-[#FDF2F2] text-[#8C2C2C] text-xs font-bold transition-all shadow-sm"
                        title="Delete video cut options"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#8C2C2C]" />
                        Delete
                      </button>
                    </div>

                    <a
                      href={resolveVideoUrl(v.driveStreamUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#7D8876] hover:text-[#1A2118] font-mono"
                    >
                      Direct Stream Link &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: INVOICES (WITH RUPEES & WORK DESCRIPTIONS) */}
        {/* ======================================================== */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl overflow-hidden border border-[#DDD9D0] bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F1EDE4] border-b border-[#DDD9D0] text-[#5A6354] font-semibold uppercase tracking-wider font-mono">
                  <tr>
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Client Profile</th>
                    <th className="p-4">Work Scope / Description</th>
                    <th className="p-4">Amount (₹)</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Invoice Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD9D0]/60 text-[#2C3527]">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center text-[#7D8876]">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Receipt className="w-8 h-8 text-[#BAC8B0]" />
                          <span className="font-bold text-sm text-[#1A2118]">No Invoices Issued Yet</span>
                          <span className="text-xs text-[#7D8876]">Click "+ New Invoice" in the top bar to issue digital invoices in ₹ INR.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F8F6F0] transition-colors">
                        <td className="p-4 font-mono font-bold text-[#1A2118]">{inv.invoiceNumber}</td>
                        <td className="p-4 font-medium">
                          <div>{inv.client?.name || inv.clientId}</div>
                          <div className="text-[11px] text-[#7D8876] font-normal">{inv.client?.company}</div>
                        </td>
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
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setViewingInvoice(inv)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F4F1EA] hover:bg-[#EAE5DA] text-[#1A2118] font-bold text-xs transition-colors"
                              title="Inspect Digital Invoice"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#5E734F]" />
                              View
                            </button>
                            <button
                              onClick={() => setInvoiceToDelete(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 text-xs font-bold border border-red-200 hover:border-red-400 transition-colors"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: CLIENTS (WITH GOOGLE DRIVE, HIBERNATE & DELETE) */}
        {/* ======================================================== */}
        {activeTab === 'clients' && (
          <div className="space-y-6 w-full max-w-full overflow-hidden">
            {/* Header & Filter Controls */}
            <div className="bg-white p-5 rounded-2xl border border-[#E7E2D7] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#1A2118] flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#5E734F]" />
                  Client Accounts & Studio Vaults
                </h2>
                <p className="text-xs text-[#6B7265] mt-0.5">
                  Manage client accounts, separate active productions from completed project archives, and control credentials.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* View Switcher Toggle: Cards vs Table */}
                <div className="flex items-center rounded-xl bg-[#F4F1EA] p-1 border border-[#DDD9D0]">
                  <button
                    type="button"
                    onClick={() => setClientViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      clientViewMode === 'cards'
                        ? 'bg-[#1A2118] text-white shadow-xs'
                        : 'text-[#5A6354] hover:text-[#1A2118]'
                    }`}
                    title="Grid Card View (Optimized for all screens)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      clientViewMode === 'table'
                        ? 'bg-[#1A2118] text-white shadow-xs'
                        : 'text-[#5A6354] hover:text-[#1A2118]'
                    }`}
                    title="Compact Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setClientStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      clientStatusFilter === 'ALL'
                        ? 'bg-[#1A2118] text-white shadow-xs'
                        : 'bg-[#F4F1EA] text-[#5A6354] hover:bg-[#EAE5DA]'
                    }`}
                  >
                    All ({clients.length})
                  </button>
                  <button
                    onClick={() => setClientStatusFilter('ACTIVE')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      clientStatusFilter === 'ACTIVE'
                        ? 'bg-[#5E734F] text-white shadow-xs'
                        : 'bg-[#F4F1EA] text-[#5A6354] hover:bg-[#EAE5DA]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Active ({clients.filter(c => c.status === 'ACTIVE').length})
                  </button>
                  <button
                    onClick={() => setClientStatusFilter('HIBERNATED')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      clientStatusFilter === 'HIBERNATED'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-[#F4F1EA] text-[#5A6354] hover:bg-[#EAE5DA]'
                    }`}
                  >
                    <Archive className="w-3 h-3" />
                    Work Complete ({clients.filter(c => c.status === 'HIBERNATED').length})
                  </button>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 ml-auto lg:ml-0">
                  <button
                    onClick={() => handleOpenPopupModal(null)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1A2118] hover:bg-[#2C3527] text-white text-xs font-bold transition-all shadow-sm"
                    title="Send instant push popup alert to client phone (displays even if app is closed)"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Send Device Popup</span>
                  </button>

                  <button
                    onClick={() => setShowClientModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Onboard Client
                  </button>
                </div>
              </div>
            </div>

            {/* VIEW MODE 1: RESPONSIVE CARDS VIEW (NEVER OVERFLOWS SCREEN) */}
            {clientViewMode === 'cards' && (
              clients.length === 0 ? (
                <div className="py-16 px-6 text-center bg-white rounded-3xl border border-dashed border-[#DDD9D0] flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F4F1EA] text-[#5E734F] flex items-center justify-center">
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="text-base font-bold text-[#1A2118]">No Clients Onboarded Yet</div>
                  <p className="text-xs text-[#7D8876] max-w-sm">
                    Your workspace is clean and ready. Click "+ Onboard Client" to register your first client with automated credentials and dual Google Drive folders.
                  </p>
                  <button
                    onClick={() => setShowClientModal(true)}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Onboard Client</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {clients
                    .filter(c => {
                      if (clientStatusFilter === 'ACTIVE') return c.status === 'ACTIVE';
                      if (clientStatusFilter === 'HIBERNATED') return c.status === 'HIBERNATED';
                      return true;
                    })
                    .map((c) => {
                    const isHibernated = c.status === 'HIBERNATED';
                    const deviceCount = clientDeviceStats[c.id] || 0;
                    return (
                      <div
                        key={c.id}
                        className="bg-white rounded-2xl border border-[#E7E2D7] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        {/* Card Header: Brand, ID & Status */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-2xl bg-[#F4F1EA] border border-[#DDD9D0] flex items-center justify-center font-bold text-sm text-[#1A2118] shrink-0 shadow-2xs">
                                {c.company.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-base font-bold text-[#1A2118] leading-tight truncate" title={c.company}>
                                  {c.company}
                                </h3>
                                <div className="text-[11px] font-mono text-[#7D8876] mt-0.5">
                                  {c.id}
                                </div>
                              </div>
                            </div>

                            {/* Status Pill */}
                            <div className="shrink-0">
                              {isHibernated ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  HIBERNATED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#5E734F]"></span>
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Phone Push Device Status */}
                          <div className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFECE5] flex items-center justify-between text-xs">
                            <span className="text-[#6B7265] text-[11px] font-medium">Device Push Status:</span>
                            {deviceCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <Smartphone className="w-3 h-3 text-emerald-600" />
                                <span>{deviceCount} Phone(s) Ready</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7D8876] bg-white px-2 py-0.5 rounded-full border border-[#DDD9D0]">
                                <Smartphone className="w-3 h-3 text-stone-400" />
                                <span>Phone Idle</span>
                              </span>
                            )}
                          </div>

                          {/* Contact Details */}
                          <div className="space-y-1.5 text-xs text-[#5A6354] pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[#7D8876]">Contact:</span>
                              <span className="font-semibold text-[#1A2118] truncate ml-2">{c.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#7D8876]">Phone:</span>
                              <span className="font-mono text-[#1A2118] ml-2">{c.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#7D8876]">Login ID:</span>
                              <span className="font-mono font-medium text-[#3D4C33] truncate ml-2 max-w-[200px]" title={c.email}>
                                {c.email}
                              </span>
                            </div>
                          </div>

                          {/* Dedicated Google Drive Links */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1EDE4]">
                            <a
                              href={`https://drive.google.com/drive/folders/${c.brandKitDriveFolderId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EDF2E9] text-[#3D4C33] font-mono text-[11px] font-bold border border-[#BAC8B0] hover:bg-[#E2ECD9] transition-colors"
                              title="Client's Dedicated Google Drive Folder"
                            >
                              <Folder className="w-3.5 h-3.5 text-[#5E734F]" />
                              <span>Client Drive</span>
                              <ExternalLink className="w-3 h-3 text-[#7D8876]" />
                            </a>
                            <a
                              href={`https://drive.google.com/drive/folders/${c.adminDriveFolderId || 'admin_archive_' + c.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F4F1EA] text-[#1A2118] font-mono text-[11px] font-bold border border-[#DDD9D0] hover:bg-[#E2ECD9] transition-colors"
                              title="Central Admin Master Archive Folder"
                            >
                              <Folder className="w-3.5 h-3.5 text-[#1A2118]" />
                              <span>Admin Archive</span>
                              <ExternalLink className="w-3 h-3 text-[#7D8876]" />
                            </a>
                          </div>
                        </div>

                        {/* Card Bottom: Action Dock */}
                        <div className="pt-3 border-t border-[#F1EDE4] space-y-2">
                          {/* Primary: Send Phone Popup Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPopupModal(c)}
                            className="w-full py-2 px-3 rounded-xl bg-[#1A2118] hover:bg-[#2C3527] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 group"
                            title="Send System Popup Alert to Client Phone (Displays even if app is closed)"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span>Send Device Popup</span>
                          </button>

                          {/* Secondary Action Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClientProfileId(c.id);
                                setActiveTab('videos');
                              }}
                              className="py-1.5 px-2 rounded-lg bg-[#FAF8F5] hover:bg-[#EFECE5] text-[#1A2118] text-xs font-bold border border-[#DDD9D0] transition-colors flex items-center justify-center gap-1"
                              title="View Deliverables Vault"
                            >
                              <Film className="w-3 h-3 text-[#5E734F]" />
                              <span>Deliverables</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setResetPasswordClient(c);
                                setAdminResetPassValue(`ZenvPass!${Math.floor(1000 + Math.random() * 9000)}`);
                              }}
                              className="py-1.5 px-2 rounded-lg bg-[#EDF2E9] hover:bg-[#E2ECD9] text-[#3D4C33] text-xs font-bold border border-[#BAC8B0] transition-colors flex items-center justify-center gap-1"
                              title="Reset Client Password"
                            >
                              <Key className="w-3 h-3 text-[#5E734F]" />
                              <span>Reset Pass</span>
                            </button>
                          </div>

                          {/* Tertiary Row: Work Complete & Delete */}
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <button
                              type="button"
                              disabled={isTogglingHibernate === c.id}
                              onClick={() => handleToggleClientHibernate(c)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                                isHibernated
                                  ? 'bg-[#EDF2E9] hover:bg-[#E2ECD9] text-[#3D4C33] border-[#BAC8B0]'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                              title={
                                isHibernated
                                  ? 'Reactivate client project to Active Production'
                                  : 'Conclude production & hibernate client'
                              }
                            >
                              {isHibernated ? (
                                <>
                                  <RefreshCw className="w-3 h-3 text-[#5E734F]" />
                                  <span>Reactivate</span>
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3 h-3 text-amber-700" />
                                  <span>Work Done</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setClientToDelete(c)}
                              className="py-1.5 px-2 rounded-lg bg-white hover:bg-red-50 text-red-700 text-xs font-bold border border-red-200 hover:border-red-400 transition-colors flex items-center justify-center gap-1"
                              title="Permanently Delete Client Profile & Login"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* VIEW MODE 2: TABLE VIEW (WITH DEDICATED HORIZONTAL SCROLL) */}
            {clientViewMode === 'table' && (
              <div className="glass-panel rounded-2xl border border-[#DDD9D0] bg-white shadow-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="bg-[#F1EDE4] border-b border-[#DDD9D0] text-[#5A6354] font-semibold uppercase tracking-wider font-mono">
                      <tr>
                        <th className="p-4">Client Company</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Login Email (ID)</th>
                        <th className="p-4">Client Drive</th>
                        <th className="p-4">Admin Archive</th>
                        <th className="p-4">Status & Push</th>
                        <th className="p-4 text-right">Account Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD9D0]/60 text-[#2C3527]">
                      {clients.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-12 text-center text-[#7D8876]">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <Users className="w-6 h-6 text-[#BAC8B0]" />
                              <span className="font-semibold text-xs text-[#1A2118]">No clients registered in fresh workspace</span>
                              <span className="text-[11px] text-[#7D8876]">Click "+ Onboard Client" to add your first enterprise client.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        clients
                          .filter(c => {
                            if (clientStatusFilter === 'ACTIVE') return c.status === 'ACTIVE';
                            if (clientStatusFilter === 'HIBERNATED') return c.status === 'HIBERNATED';
                            return true;
                          })
                          .map((c) => {
                          const isHibernated = c.status === 'HIBERNATED';
                          const deviceCount = clientDeviceStats[c.id] || 0;
                          return (
                            <tr key={c.id} className="hover:bg-[#F8F6F0] transition-colors">
                              <td className="p-4 font-bold text-[#1A2118]">
                                <div className="font-bold text-sm">{c.company}</div>
                                <div className="text-[10px] font-mono text-[#7D8876] font-normal">{c.id}</div>
                              </td>
                              <td className="p-4 font-medium">
                                <div>{c.name}</div>
                                <div className="text-[11px] text-[#7D8876] font-normal">{c.phone || 'N/A'}</div>
                              </td>
                              <td className="p-4 font-mono font-semibold text-[#3D4C33]">{c.email}</td>
                              <td className="p-4">
                                <a
                                  href={`https://drive.google.com/drive/folders/${c.brandKitDriveFolderId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EDF2E9] text-[#3D4C33] font-mono text-[11px] font-bold border border-[#BAC8B0] hover:bg-[#E2ECD9]"
                                  title="Client's Dedicated Google Drive Folder"
                                >
                                  <Folder className="w-3.5 h-3.5 text-[#5E734F]" />
                                  <span>Client</span>
                                  <ExternalLink className="w-3 h-3 text-[#7D8876]" />
                                </a>
                              </td>
                              <td className="p-4">
                                <a
                                  href={`https://drive.google.com/drive/folders/${c.adminDriveFolderId || 'admin_archive_' + c.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F4F1EA] text-[#1A2118] font-mono text-[11px] font-bold border border-[#DDD9D0] hover:bg-[#E2ECD9]"
                                  title="Central Admin Master Archive Folder"
                                >
                                  <Folder className="w-3.5 h-3.5 text-[#1A2118]" />
                                  <span>Archive</span>
                                  <ExternalLink className="w-3 h-3 text-[#7D8876]" />
                                </a>
                              </td>
                              <td className="p-4">
                                {isHibernated ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    HIBERNATED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#5E734F]"></span>
                                    ACTIVE
                                  </span>
                                )}
                                {deviceCount > 0 ? (
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-mono font-medium">
                                    <Smartphone className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>{deviceCount} device(s) ready</span>
                                  </div>
                                ) : (
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-stone-400 font-mono">
                                    <Smartphone className="w-2.5 h-2.5 text-stone-400" />
                                    <span>Idle</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {/* Send Phone Popup Alert */}
                                  <button
                                    onClick={() => handleOpenPopupModal(c)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1A2118] hover:bg-[#2C3527] text-white text-xs font-bold transition-all shadow-xs"
                                    title="Send System Popup Alert to Client Phone"
                                  >
                                    <Smartphone className="w-3 h-3 text-emerald-400" />
                                    <span>Send Popup</span>
                                  </button>

                                  {/* Deliverables view */}
                                  <button
                                    onClick={() => {
                                      setSelectedClientProfileId(c.id);
                                      setActiveTab('videos');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EFECE5] text-[#1A2118] text-xs font-bold border border-[#DDD9D0] transition-colors"
                                    title="View Deliverables Vault"
                                  >
                                    Deliverables
                                  </button>

                                  {/* Reset Password */}
                                  <button
                                    onClick={() => {
                                      setResetPasswordClient(c);
                                      setAdminResetPassValue(`ZenvPass!${Math.floor(1000 + Math.random() * 9000)}`);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EDF2E9] hover:bg-[#E2ECD9] text-[#3D4C33] text-xs font-bold border border-[#BAC8B0] transition-colors"
                                    title="Reset Client Password"
                                  >
                                    <Key className="w-3 h-3 text-[#5E734F]" />
                                    <span>Pass</span>
                                  </button>

                                  {/* Separate Feature 1: Work Complete / Hibernate */}
                                  <button
                                    disabled={isTogglingHibernate === c.id}
                                    onClick={() => handleToggleClientHibernate(c)}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all border ${
                                      isHibernated
                                        ? 'bg-[#EDF2E9] hover:bg-[#E2ECD9] text-[#3D4C33] border-[#BAC8B0]'
                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                    }`}
                                    title={
                                      isHibernated
                                        ? 'Reactivate client project to Active Production'
                                        : 'Conclude production & hibernate client'
                                    }
                                  >
                                    {isHibernated ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 text-[#5E734F]" />
                                        <span>Reactivate</span>
                                      </>
                                    ) : (
                                      <>
                                        <Archive className="w-3 h-3 text-amber-700" />
                                        <span>Conclude</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Separate Feature 2: Client Delete */}
                                  <button
                                    onClick={() => setClientToDelete(c)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 text-red-700 text-xs font-bold border border-red-200 hover:border-red-400 transition-colors"
                                    title="Permanently Delete Client Profile & Login"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-600" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 6: SECURITY */}
        {/* ======================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-sm">
              <h3 className="text-sm font-bold text-[#1A2118] uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#BD4848]" />
                Active IP Lockouts ({blockedIps.length})
              </h3>
              {blockedIps.length === 0 ? (
                <div className="text-xs text-[#666F60] italic">No IPs currently blacklisted. Edge firewall operational.</div>
              ) : (
                <div className="divide-y divide-[#DDD9D0]">
                  {blockedIps.map((b) => (
                    <div key={b.ip} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs font-bold text-[#8C2C2C]">{b.ip}</div>
                        <div className="text-xs text-[#666F60] mt-0.5">{b.reason}</div>
                      </div>
                      <button
                        onClick={() => handleUnblockIp(b.ip)}
                        className="px-3 py-1.5 rounded-lg bg-[#BD4848] hover:bg-[#9E3636] text-white text-xs font-bold transition-colors"
                      >
                        Unblock IP
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-sm">
              <h3 className="text-sm font-bold text-[#1A2118] uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#5E734F]" />
                System Audit Trail (Google Sheets Synced)
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-[#F8F6F0] border border-[#DDD9D0] text-xs flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1A2118]">{log.event}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#EFECE5] text-[#5A6354]">
                          IP: {log.ip}
                        </span>
                      </div>
                      <div className="text-[#5A6354] mt-1">{log.details}</div>
                    </div>
                    <span className="text-[10px] font-mono text-[#7D8876] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW: STUDIO CHAT (REAL-TIME CLIENT & ADMIN MESSAGING) */}
        {/* ======================================================== */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl border border-[#E7E2D7] shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[680px]">
            {/* Left Column: Client Threads List */}
            <div className="w-full md:w-80 border-r border-[#E7E2D7] bg-[#FAF8F5] flex flex-col shrink-0">
              <div className="p-4 border-b border-[#E7E2D7] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#1A2118] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#5E734F]" />
                    Client Conversations
                  </h3>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]">
                    {clients.length} Channels
                  </span>
                </div>

                {/* Client Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search client or company..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white border border-[#DDD9D0] text-[#1A2118] focus:outline-none focus:border-[#5E734F]"
                  />
                  <Search className="w-3.5 h-3.5 text-[#7D8876] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Clients List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#EFECE5] p-2 space-y-1">
                {clients
                  .filter((c) =>
                    !chatSearchQuery ||
                    c.company?.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
                    c.name?.toLowerCase().includes(chatSearchQuery.toLowerCase())
                  )
                  .map((c) => {
                    const isSelected = activeChatClientId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectChatClient(c.id)}
                        className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'bg-[#1A2118] text-white shadow-sm'
                            : 'bg-white hover:bg-[#F3EFE7] text-[#1A2118] border border-[#E7E2D7]'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? 'bg-white text-[#1A2118]'
                              : 'bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0]'
                          }`}
                        >
                          {c.company ? c.company.slice(0, 2).toUpperCase() : 'CL'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs truncate">{c.company}</span>
                            <span
                              className={`text-[10px] font-mono ${
                                isSelected ? 'text-white/70' : 'text-[#7D8876]'
                              }`}
                            >
                              {c.id}
                            </span>
                          </div>
                          <div
                            className={`text-[11px] truncate mt-0.5 ${
                              isSelected ? 'text-white/80' : 'text-[#5A6354]'
                            }`}
                          >
                            {c.name} • {c.email}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                {clients.length === 0 && (
                  <div className="p-6 text-center text-xs text-[#7D8876]">No clients onboarded yet.</div>
                )}
              </div>
            </div>

            {/* Right Column: Chat Room & Composer */}
            <div className="flex-1 flex flex-col bg-white">
              {activeChatClientId && clients.find((c) => c.id === activeChatClientId) ? (
                (() => {
                  const currentClient = clients.find((c) => c.id === activeChatClientId);
                  return (
                    <>
                      {/* Chat Room Header */}
                      <div className="p-4 border-b border-[#E7E2D7] bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#5E734F] text-white flex items-center justify-center font-black text-xs shadow-sm">
                            {currentClient.company ? currentClient.company.slice(0, 2).toUpperCase() : 'CL'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base text-[#1A2118]">{currentClient.company}</h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF2E9] text-[#3D4C33] font-bold border border-[#BAC8B0]">
                                {currentClient.id}
                              </span>
                            </div>
                            <div className="text-xs text-[#5A6354] flex items-center gap-2">
                              <span>Contact: <strong>{currentClient.name}</strong> ({currentClient.email})</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-[#4A5D3E] font-medium">
                                <span className="w-2 h-2 rounded-full bg-[#5E734F] animate-pulse" />
                                Live Studio Channel
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {currentClient.brandKitDriveFolderId && (
                            <a
                              href={`https://drive.google.com/drive/folders/${currentClient.brandKitDriveFolderId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl border border-[#BAC8B0] bg-white hover:bg-[#F3EFE7] text-[#3D4C33] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Folder className="w-3.5 h-3.5 text-[#5E734F]" />
                              Client Drive
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenPopupModal(currentClient)}
                            className="px-3 py-1.5 rounded-xl bg-[#1A2118] hover:bg-[#2C3527] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                            title="Send System Popup Alert to Client Phone (Displays even if app is closed)"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">Send Phone Popup</span>
                          </button>
                          <button
                            onClick={() => fetchChatMessages(activeChatClientId)}
                            className="p-1.5 rounded-xl border border-[#E7E2D7] bg-white text-[#5A6354] hover:bg-[#F1EDE4]"
                            title="Refresh Thread"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Messages Scrollable Timeline */}
                      <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[460px] min-h-[360px] bg-[#FAF9F6]">
                        {chatMessages.length === 0 ? (
                          <div className="p-12 text-center text-xs text-[#7D8876] space-y-2">
                            <MessageSquare className="w-8 h-8 mx-auto text-[#BAC8B0]" />
                            <p className="font-bold text-[#1A2118]">No messages yet with {currentClient.company}</p>
                            <p>Send a message below to kick off real-time production coordination.</p>
                          </div>
                        ) : (
                          chatMessages.map((msg) => {
                            const isAdmin = msg.senderRole === 'ADMIN';
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                              >
                                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-[#7D8876]">
                                  <span className="font-semibold text-[#1A2118]">
                                    {isAdmin ? 'You (Studio)' : msg.senderName}
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono text-[10px]">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                      isAdmin
                                        ? 'bg-[#EAF0E5] text-[#3D4C33] border border-[#CCD8C4]'
                                        : 'bg-[#FEF9EE] text-[#8C5D1E] border border-[#F0D59D]'
                                    }`}
                                  >
                                    {msg.senderRole}
                                  </span>
                                </div>

                                <div
                                  className={`max-w-md rounded-2xl p-4 shadow-sm text-xs space-y-2 ${
                                    isAdmin
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
                                            setFeedbackNotice(`Timecode marker referenced: ${msg.timecode}`);
                                            setTimeout(() => setFeedbackNotice(null), 3000);
                                          }}
                                          className="cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EAF0E5] text-[#3D4C33] border border-[#CCD8C4] flex items-center gap-1"
                                          title="Click to highlight timecode"
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
                                      isAdmin ? 'text-white/60' : 'text-[#7D8876]'
                                    }`}
                                  >
                                    <span>{msg.isReadByClient ? '✓✓ Read by Client' : '✓ Delivered'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Quick Reply Suggestions */}
                      <div className="px-4 py-2 border-t border-[#E7E2D7] bg-[#FAF8F5] flex items-center gap-1.5 overflow-x-auto text-xs">
                        <span className="text-[10px] font-bold uppercase text-[#7D8876] shrink-0 mr-1">Quick Chips:</span>
                        {[
                          '🎨 Color grade v2 uploaded for review',
                          '⏱ Please verify timecode cut',
                          '💰 Invoice settlement received with thanks',
                          '🎬 Master ProRes deliverable is ready',
                          '✂️ Audio mix rebalanced'
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
                      <form onSubmit={handleSendAdminMessage} className="p-4 border-t border-[#E7E2D7] bg-white space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Tag selector */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-[#7D8876] font-semibold text-[11px]">Tag:</span>
                            <select
                              value={chatInputTag}
                              onChange={(e) => setChatInputTag(e.target.value)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-[#FAF8F5] border border-[#DDD9D0] text-[#1A2118] font-semibold"
                            >
                              <option value="GENERAL">General Discussion</option>
                              <option value="COLOR_GRADE">🎨 Color Grade</option>
                              <option value="REVISION">✂️ Revision Note</option>
                              <option value="DELIVERY">🎬 Deliverable Master</option>
                              <option value="INVOICE">💳 Billing / Invoice</option>
                            </select>
                          </div>

                          {/* Timecode input */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-[#7D8876] font-semibold text-[11px]">Timecode:</span>
                            <input
                              type="text"
                              value={chatInputTimecode}
                              onChange={(e) => setChatInputTimecode(e.target.value)}
                              placeholder="e.g. 00:45"
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
                            placeholder={`Message ${currentClient.company}... (Press Enter to Send)`}
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
                    </>
                  );
                })()
              ) : (
                <div className="flex-1 flex items-center justify-center p-12 text-center text-xs text-[#7D8876]">
                  Select a client channel on the left to start chatting.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: DELETE VIDEO WITH "DELETE FOR ME" & "DELETE FOR EVERYONE" */}
      {/* ======================================================== */}
      {videoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A2118]/50 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#E7E2D7] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FDF2F2] border border-[#E8BDBD] flex items-center justify-center text-[#8C2C2C]">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A2118]">Delete Deliverable Cut</h3>
                  <p className="text-xs text-[#7D8876]">Choose deletion scope for this video asset</p>
                </div>
              </div>
              <button
                onClick={() => setVideoToDelete(null)}
                className="p-1 rounded-lg hover:bg-[#F3EFE7] text-[#7D8876]"
              >
                ✕
              </button>
            </div>

            {/* Target Video Details */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D7] text-xs space-y-1">
              <div className="font-bold text-[#1A2118] text-sm truncate">{videoToDelete.title}</div>
              <div className="text-[#5A6354] flex items-center gap-2">
                <span className="font-mono text-[#5E734F] font-semibold">{videoToDelete.version || 'v1.0'}</span>
                <span>•</span>
                <span>{videoToDelete.client?.company || videoToDelete.clientId}</span>
              </div>
            </div>

            {/* Two Distinct Deletion Options */}
            <div className="space-y-3">
              {/* Option 1: Delete For Me */}
              <div className="p-4 rounded-xl border border-[#BAC8B0] hover:border-[#5E734F] bg-[#FAFBF9] transition-all flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF2E9] border border-[#BAC8B0] flex items-center justify-center text-[#3D4C33] shrink-0 mt-0.5">
                    <EyeOff className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1A2118]">Delete for Me (Hide from Studio View)</div>
                    <p className="text-[11px] text-[#5A6354] mt-0.5 leading-relaxed">
                      Removes this video from your Admin Dashboard view only. The client will <strong>still be able to view, review, and download</strong> this cut in their Client Portal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={deleteScopeSubmitting}
                  onClick={() => handleExecuteDelete('for_me')}
                  className="w-full py-2 px-3 rounded-lg bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  {deleteScopeSubmitting ? 'Updating...' : 'Delete for Me'}
                </button>
              </div>

              {/* Option 2: Delete For Everyone */}
              <div className="p-4 rounded-xl border border-[#E8BDBD] hover:border-[#8C2C2C] bg-[#FFFBFB] transition-all flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FDF2F2] border border-[#E8BDBD] flex items-center justify-center text-[#8C2C2C] shrink-0 mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#8C2C2C]">Delete for Everyone (Permanent)</div>
                    <p className="text-[11px] text-[#5A6354] mt-0.5 leading-relaxed">
                      Permanently deletes the deliverable cut, unlinks stored video files from the server, and purges it from <strong>both Studio Admin and Client Portal</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={deleteScopeSubmitting}
                  onClick={() => handleExecuteDelete('for_everyone')}
                  className="w-full py-2 px-3 rounded-lg bg-[#8C2C2C] hover:bg-[#722323] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleteScopeSubmitting ? 'Deleting...' : 'Delete for Everyone'}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setVideoToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ONBOARD CLIENT (WITH PASSWORD & DUAL GOOGLE DRIVE) */}
      {/* ======================================================== */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A2118]/40 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#1A2118] mb-1">Onboard Client & Create Account</h3>
            <p className="text-xs text-[#5A6354] mb-4">
              Create the client's login account and allocate synchronized Google Drive folders for both the client and the admin archive.
            </p>

            <form onSubmit={handleCreateClient} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                    placeholder="e.g. Jessica Lin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Company / Brand</label>
                  <input
                    type="text"
                    required
                    value={newClient.company}
                    onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                    placeholder="e.g. Velocity EV"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Login Email (Username)</label>
                  <input
                    type="email"
                    required
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                    placeholder="jessica@velocityev.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Mobile Phone (SMS)</label>
                  <input
                    type="tel"
                    required
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Password configuration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase">
                    Client Account Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPass = `ZenvPass!${Math.floor(1000 + Math.random() * 9000)}`;
                      setNewClient({ ...newClient, password: randomPass });
                    }}
                    className="text-[11px] text-[#5E734F] hover:underline font-semibold"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewClientPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newClient.password}
                    onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                    className="w-full glass-input rounded-xl pl-3 pr-10 py-2 text-sm font-mono"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewClientPassword(!showNewClientPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D8876] hover:text-[#1A2118]"
                  >
                    {showNewClientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Client Google Drive Account Email */}
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">
                  Client Google Drive Account (For Shared Workspace)
                </label>
                <input
                  type="email"
                  value={newClient.clientDriveEmail}
                  onChange={(e) => setNewClient({ ...newClient, clientDriveEmail: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder="Defaults to Login Email (e.g. client@gmail.com)"
                />
              </div>

              {/* Google Drive Dual-Sync Notice */}
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD9D0] text-xs text-[#5A6354] space-y-1">
                <div className="font-bold text-[#1A2118] flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-[#5E734F]" />
                  Dual Google Drive Synchronization
                </div>
                <div>1. <strong>Client Drive:</strong> Client deliverables and invoices are shared to their Google Drive.</div>
                <div>2. <strong>Admin Archive Drive:</strong> Complete backup mirrors in central studio master storage.</div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold shadow-md shadow-[#5E734F]/20"
                >
                  Create Client & Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SEND DEVICE POPUP MESSAGE (SHOWS ON CLIENT PHONE EVEN IF APP IS CLOSED) */}
      {/* ======================================================== */}
      {showPopupModal && popupTargetClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A2118]/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl p-6 md:p-8 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#E7E2D7] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#1A2118] text-white flex items-center justify-center shadow-sm relative">
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1A2118] flex items-center gap-2">
                    Send Client Phone Popup Message
                  </h3>
                  <p className="text-xs text-[#5A6354]">
                    Dispatches a native system popup & notification alert to the client's phone or desktop screen — <strong className="text-[#1A2118]">even if the app is closed</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPopupModal(false)}
                className="text-[#7D8876] hover:text-[#1A2118] p-1.5 rounded-lg hover:bg-[#F1EDE4]"
              >
                ✕
              </button>
            </div>

            {/* Target Client Profile Card with Device Connection Status */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#7D8876]">Target Client:</span>
                  <select
                    value={popupTargetClient.id}
                    onChange={(e) => {
                      const selected = clients.find(c => c.id === e.target.value);
                      if (selected) {
                        setPopupTargetClient(selected);
                        setPopupResult(null);
                      }
                    }}
                    className="font-bold text-xs text-[#1A2118] bg-white border border-[#DDD9D0] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#5E734F]"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.company} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[11px] text-[#6B7265] flex items-center gap-2">
                  <span>Contact: {popupTargetClient.name}</span>
                  <span>•</span>
                  <span className="font-mono">{popupTargetClient.email}</span>
                </div>
              </div>

              {/* Live Device Status Badge */}
              <div className="sm:text-right shrink-0">
                {clientDeviceStats[popupTargetClient.id] > 0 ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDF2E9] border border-[#BAC8B0] text-[#3D4C33] text-xs font-semibold shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{clientDeviceStats[popupTargetClient.id]} Phone/Device Active</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F1EA] border border-[#DDD9D0] text-[#6B7265] text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>No Active Phone Subscriptions Yet</span>
                  </div>
                )}
                <div className="text-[10px] text-[#7D8876] mt-1 font-mono">
                  {clientDeviceStats[popupTargetClient.id] > 0 ? 'Ready for immediate phone popup' : 'Will pop up when client enables push'}
                </div>
              </div>
            </div>

            {/* Quick 1-Click Message Presets */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#3D4C33] uppercase">
                Quick Message Presets:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'CUT_READY', label: '🎬 4K Cut Ready' },
                  { key: 'URGENT_DEADLINE', label: '⏰ Urgent Deadline' },
                  { key: 'SHOOT_UPDATE', label: '📅 Shoot Schedule' },
                  { key: 'DIRECTOR_NOTE', label: '💬 Director Note' },
                  { key: 'INVOICE_READY', label: '💳 Invoice Settlement' }
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleApplyPopupPreset(preset.key)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-[#F4F1EA] hover:bg-[#EAE5DA] text-[#2C3527] border border-[#DDD9D0] transition-all flex items-center gap-1"
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSendPopupMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">
                  Notification Title (Shows in phone notification header)
                </label>
                <input
                  type="text"
                  required
                  value={popupTitle}
                  onChange={(e) => setPopupTitle(e.target.value)}
                  placeholder="e.g. 🎬 Urgent Cut Review Required"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1A2118]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase">
                    Popup Message Body (Shows in phone notification tray & lock screen)
                  </label>
                  <span className={`text-[11px] font-mono ${popupMessage.length > 200 ? 'text-amber-700 font-bold' : 'text-[#7D8876]'}`}>
                    {popupMessage.length} / 250 chars
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={popupMessage}
                  onChange={(e) => setPopupMessage(e.target.value)}
                  placeholder="Enter the popup message that will alert the client..."
                  className="w-full glass-input rounded-xl p-3 text-xs text-[#1A2118] resize-none leading-relaxed"
                />
              </div>

              {/* Action Tab Target Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1.5">
                  When Client Taps Popup, Open Tab:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'review', label: 'Video Review', icon: Film },
                    { id: 'shoots', label: 'Shoot Schedule', icon: Calendar },
                    { id: 'chat', label: 'Studio Chat', icon: MessageSquare },
                    { id: 'invoices', label: 'Invoices', icon: DollarSign }
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isSelected = popupActionTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPopupActionTab(tab.id)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-[#1A2118] text-white border-[#1A2118] shadow-xs'
                            : 'bg-[#FAF8F5] text-[#5A6354] border-[#E7E2D7] hover:bg-[#F1EDE4]'
                        }`}
                      >
                        <TabIcon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* High Priority & Vibration Pattern Toggle */}
              <div className="p-3.5 rounded-xl bg-[#EDF2E9]/70 border border-[#BAC8B0] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#5E734F] text-white flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#1A2118]">High Priority Phone Popup & Vibration</h5>
                    <p className="text-[11px] text-[#5A6354]">
                      Triggers distinct phone vibration and forces the popup banner to stay visible until tapped.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={popupUrgent}
                  onChange={(e) => setPopupUrgent(e.target.checked)}
                  className="w-4 h-4 accent-[#5E734F] rounded cursor-pointer"
                />
              </div>

              {/* Realistic Mobile Screen Mockup Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase text-[#7D8876]">
                  Live Mobile Phone Notification Preview (Lock Screen / Notification Tray):
                </span>
                <div className="p-4 rounded-2xl bg-[#141A13] text-white border border-[#2D382A] shadow-md space-y-2 font-sans">
                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#5E734F] flex items-center justify-center text-[9px] font-bold text-white">
                        Z
                      </div>
                      <span className="font-semibold text-white/90">Zenv Digital Studio</span>
                    </div>
                    <span className="font-mono text-[10px]">Just now</span>
                  </div>
                  <div className="pl-5 space-y-1">
                    <div className="font-bold text-xs text-white tracking-wide">
                      {popupTitle || 'Alert Title'}
                    </div>
                    <div className="text-[11px] text-white/80 leading-snug">
                      {popupMessage || 'Popup message text will appear here on the client\'s phone status bar...'}
                    </div>
                    <div className="pt-2 flex items-center gap-2 text-[10px]">
                      <span className="px-2.5 py-1 rounded-md bg-white/10 text-white font-medium hover:bg-white/20">
                        View Update &rarr;
                      </span>
                      <span className="text-white/40">Dismiss</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Result Feedback */}
              {popupResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    popupResult.type === 'success'
                      ? 'bg-[#EDF2E9] border-[#BAC8B0] text-[#2C3527]'
                      : 'bg-[#FDF2F2] border-[#E8BDBD] text-[#8C2C2C]'
                  }`}
                >
                  {popupResult.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-[#5E734F] shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#8C2C2C] shrink-0 mt-0.5" />
                  )}
                  <div className="leading-relaxed">
                    <p className="font-bold">{popupResult.text}</p>
                    {popupResult.type === 'success' && popupResult.deliveredCount > 0 && (
                      <p className="text-[11px] text-[#5E734F] mt-0.5 font-mono">
                        ✓ Dispatched via Web Push Protocol to {popupResult.deliveredCount} phone/desktop endpoint(s).
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7E2D7]">
                <button
                  type="button"
                  onClick={() => setShowPopupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSendingPopup || !popupMessage.trim()}
                  className="px-6 py-2.5 rounded-xl bg-[#1A2118] hover:bg-[#2C3527] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  {isSendingPopup ? 'Dispatching Popup to Phone...' : 'Send Phone Popup Alert 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {onboardedClientReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A2118]/50 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-[#BAC8B0] bg-white shadow-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E7E2D7]">
              <div className="w-8 h-8 rounded-full bg-[#EDF2E9] text-[#3D4C33] flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#5E734F]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A2118]">Client Account Provisioned!</h3>
                <p className="text-xs text-[#7D8876]">Credentials and Google Drive storage configured.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D7] space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#EFECE5]">
                <span className="text-[#7D8876]">Company / Client ID:</span>
                <span className="font-bold text-[#1A2118]">
                  {onboardedClientReceipt.client.company} ({onboardedClientReceipt.client.id})
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#EFECE5]">
                <span className="text-[#7D8876]">Login Email / Username:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#1A2118]">{onboardedClientReceipt.user.email}</span>
                  <button
                    onClick={() => handleCopyText(onboardedClientReceipt.user.email, 'email')}
                    className="p-1 text-[#7D8876] hover:text-[#1A2118]"
                    title="Copy Email"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-[#5E734F]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#EFECE5]">
                <span className="text-[#7D8876]">Assigned Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#5E734F] bg-[#EDF2E9] px-2 py-0.5 rounded border border-[#BAC8B0]">
                    {onboardedClientReceipt.user.assignedPassword}
                  </span>
                  <button
                    onClick={() => handleCopyText(onboardedClientReceipt.user.assignedPassword, 'pass')}
                    className="p-1 text-[#7D8876] hover:text-[#1A2118]"
                    title="Copy Password"
                  >
                    {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-[#5E734F]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#EFECE5]">
                <span className="text-[#7D8876]">Client Google Drive:</span>
                <a
                  href={`https://drive.google.com/drive/folders/${onboardedClientReceipt.client.brandKitDriveFolderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-[#5E734F] hover:underline flex items-center gap-1"
                >
                  <span>Open Client Folder</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-[#7D8876]">Admin Master Archive:</span>
                <a
                  href={`https://drive.google.com/drive/folders/${onboardedClientReceipt.client.adminDriveFolderId || 'admin_archive'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-[#1A2118] hover:underline flex items-center gap-1"
                >
                  <span>Open Admin Archive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setOnboardedClientReceipt(null)}
                className="px-5 py-2 rounded-xl bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADMIN RESET CLIENT PASSWORD MODAL */}
      {/* ======================================================== */}
      {resetPasswordClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/40 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <h3 className="text-base font-bold text-[#1A2118] mb-1">Reset Client Password</h3>
            <p className="text-xs text-[#5A6354] mb-4">
              Set a new secure password for <strong>{resetPasswordClient.company}</strong> ({resetPasswordClient.email}).
            </p>

            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase">New Password</label>
                  <button
                    type="button"
                    onClick={() => setAdminResetPassValue(`ZenvPass!${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[11px] text-[#5E734F] hover:underline font-semibold"
                  >
                    Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={adminResetPassValue}
                  onChange={(e) => setAdminResetPassValue(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm font-mono"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordClient(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: SCHEDULE SHOOT */}
      {/* ======================================================== */}
      {showShootModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/40 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-lg p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-bold text-[#1A2118] mb-4">Schedule Production Shoot</h3>
            <form onSubmit={handleCreateShoot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Client</label>
                <select
                  required
                  value={newShoot.clientId}
                  onChange={(e) => setNewShoot({ ...newShoot, clientId: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Shoot Title</label>
                <input
                  type="text"
                  required
                  value={newShoot.title}
                  onChange={(e) => setNewShoot({ ...newShoot, title: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. Commercial Shoot Day 1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newShoot.date}
                  onChange={(e) => setNewShoot({ ...newShoot, date: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Location</label>
                <input
                  type="text"
                  value={newShoot.location}
                  onChange={(e) => setNewShoot({ ...newShoot, location: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. Studio 4 / On Location - Mumbai"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Crew & Equipment</label>
                <input
                  type="text"
                  value={newShoot.crew}
                  onChange={(e) => setNewShoot({ ...newShoot, crew: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. Lead Cinematographer, Audio Tech, RED Camera Kit"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Production Notes</label>
                <textarea
                  rows="2"
                  value={newShoot.notes}
                  onChange={(e) => setNewShoot({ ...newShoot, notes: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder="Call times, talent details, special equipment requirements..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowShootModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold transition-all shadow-sm"
                >
                  Schedule Shoot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT PRODUCTION SHOOT */}
      {/* ======================================================== */}
      {editingShoot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/40 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-lg p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1A2118] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#5E734F]" />
                Edit Production Shoot
              </h3>
              <button
                type="button"
                onClick={() => setEditingShoot(null)}
                className="text-[#7D8876] hover:text-[#1A2118] text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateShoot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Client Profile</label>
                <select
                  required
                  value={editingShoot.clientId || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, clientId: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Shoot Title</label>
                <input
                  type="text"
                  required
                  value={editingShoot.title || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, title: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. Commercial Shoot Day 1"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editingShoot.date ? editingShoot.date.split('T')[0] : ''}
                    onChange={(e) => setEditingShoot({ ...editingShoot, date: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Status</label>
                  <select
                    value={editingShoot.status || 'SCHEDULED'}
                    onChange={(e) => setEditingShoot({ ...editingShoot, status: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                    <option value="POST_PRODUCTION">POST_PRODUCTION</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Location</label>
                <input
                  type="text"
                  value={editingShoot.location || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, location: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. Studio 4 / On Location - Mumbai"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Crew & Equipment</label>
                <input
                  type="text"
                  value={editingShoot.crew || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, crew: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. Lead Cinematographer, Audio Tech, RED Camera Kit"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Production Notes</label>
                <textarea
                  rows="2"
                  value={editingShoot.notes || ''}
                  onChange={(e) => setEditingShoot({ ...editingShoot, notes: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                  placeholder="Call times, talent details, special equipment requirements..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[#DDD9D0]">
                <button
                  type="button"
                  onClick={() => setEditingShoot(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingShoot}
                  className="px-5 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold transition-all shadow-sm"
                >
                  {isUpdatingShoot ? 'Saving...' : 'Save Shoot Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE SHOOT CONFIRMATION */}
      {/* ======================================================== */}
      {shootToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/50 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A2118]">Delete Scheduled Shoot?</h3>
                <p className="text-xs text-[#5A6354] mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete shoot schedule for <strong>"{shootToDelete.title}"</strong> ({shootToDelete.date})?
                </p>
                <p className="text-[11px] text-[#7D8876] mt-2">
                  This action removes the shoot schedule from both the Studio Admin production board and the client portal.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-[#DDD9D0]">
              <button
                type="button"
                disabled={isDeletingShoot}
                onClick={() => setShootToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingShoot}
                onClick={handleExecuteDeleteShoot}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {isDeletingShoot ? 'Deleting...' : 'Delete Shoot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE CLIENT CONFIRMATION */}
      {/* ======================================================== */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/50 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A2118]">Delete Client Account?</h3>
                <p className="text-xs text-[#5A6354] mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete client profile for <strong>"{clientToDelete.company}"</strong> ({clientToDelete.name})?
                </p>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 mt-3 text-[11px] text-red-800 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Permanent Destructive Action:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-red-700 space-y-0.5">
                    <li>Login account for <strong>{clientToDelete.email}</strong> will be permanently deleted.</li>
                    <li>Client profile record will be unlinked from the studio portal.</li>
                  </ul>
                </div>
                <div className="p-3 bg-[#F4F1EA] rounded-xl border border-[#DDD9D0] mt-3 text-[11px] text-[#5A6354] flex items-start gap-2">
                  <Archive className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Work completed instead?</strong> If client production is finished, consider using <strong>"Work Complete"</strong> instead of deleting to keep deliverables and invoices preserved in the studio archives.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-[#DDD9D0]">
              <button
                type="button"
                disabled={isDeletingClient}
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingClient}
                onClick={handleExecuteDeleteClient}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {isDeletingClient ? 'Deleting...' : 'Permanently Delete Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE INVOICE CONFIRMATION */}
      {/* ======================================================== */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/50 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A2118]">Delete Tax Invoice?</h3>
                <p className="text-xs text-[#5A6354] mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete <strong>Invoice #{invoiceToDelete.invoiceNumber}</strong> for <strong>{invoiceToDelete.client?.company || invoiceToDelete.client?.name || invoiceToDelete.clientId}</strong>?
                </p>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 mt-3 text-[11px] text-red-800 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Permanent Destructive Action:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-red-700 space-y-0.5">
                    <li>Amount: <strong>₹{Number(invoiceToDelete.amount).toLocaleString('en-IN')}</strong></li>
                    <li>Status: <strong>{invoiceToDelete.status}</strong> (Due: {invoiceToDelete.dueDate})</li>
                    <li>Record will be removed from all financial ledger summaries and the client portal.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-[#DDD9D0]">
              <button
                type="button"
                disabled={isDeletingInvoice}
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingInvoice}
                onClick={handleExecuteDeleteInvoice}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {isDeletingInvoice ? 'Deleting...' : 'Permanently Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ISSUE INVOICE (RUPEES + WORK DESCRIPTION) */}
      {/* ======================================================== */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/40 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-lg p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-bold text-[#1A2118] mb-4">Issue Digital Invoice</h3>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Client Profile</label>
                <select
                  required
                  value={newInvoice.clientId}
                  onChange={(e) => setNewInvoice({ ...newInvoice, clientId: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">
                  Work Description / Deliverables Specification
                </label>
                <textarea
                  required
                  rows={3}
                  value={newInvoice.description}
                  onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                  placeholder="e.g. 4K Commercial Shoot Day 1, color grading, sound design, and 3 high-impact social media cutdowns."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Amount (₹ INR)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5E734F]">₹</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newInvoice.amount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                      className="w-full glass-input rounded-xl pl-8 pr-3 py-2 text-sm"
                      placeholder="e.g. 75000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold"
                >
                  Issue Invoice & View
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: UPLOAD VIDEO (LOCAL FILE STORAGE / URL) */}
      {/* ======================================================== */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1A2118]/40 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel w-full max-w-lg p-5 sm:p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-bold text-[#1A2118] mb-1">Upload Video Deliverable</h3>
            <p className="text-xs text-[#5A6354] mb-4">
              Upload directly from your local computer storage or enter an external stream URL.
            </p>

            {/* Storage Mode Toggle */}
            <div className="grid grid-cols-2 p-1 bg-[#F1EDE4] rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setVideoUploadMode('local')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  videoUploadMode === 'local'
                    ? 'bg-white text-[#1A2118] shadow-sm'
                    : 'text-[#666F60] hover:text-[#1A2118]'
                }`}
              >
                Local Storage File
              </button>
              <button
                type="button"
                onClick={() => setVideoUploadMode('url')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  videoUploadMode === 'url'
                    ? 'bg-white text-[#1A2118] shadow-sm'
                    : 'text-[#666F60] hover:text-[#1A2118]'
                }`}
              >
                External Stream URL
              </button>
            </div>

            <form onSubmit={handleCreateVideo} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Client Profile</label>
                <select
                  required
                  value={newVideo.clientId}
                  onChange={(e) => setNewVideo({ ...newVideo, clientId: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Choose Client Profile --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">
                  Shoot / Project Type (Manual Entry)
                </label>
                <input
                  type="text"
                  required
                  value={newVideo.shootId}
                  onChange={(e) => setNewVideo({ ...newVideo, shootId: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm bg-white"
                  placeholder="Enter project/shoot type manually (e.g. Commercial Brand Launch, Fashion Reel, Teaser)"
                />
                <span className="text-[11px] text-[#7D8876] mt-0.5 block font-sans">
                  Type any custom project name you want — no predefined option needed.
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Deliverable Title</label>
                  <input
                    type="text"
                    required
                    value={newVideo.title}
                    onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                    placeholder="e.g. Brand Film 60s Master Cut"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">Version</label>
                  <input
                    type="text"
                    required
                    value={newVideo.version}
                    onChange={(e) => setNewVideo({ ...newVideo, version: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                    placeholder="v1.0"
                  />
                </div>
              </div>

              {/* Local File Picker */}
              {videoUploadMode === 'local' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">
                    Select Video File (Local Storage)
                  </label>
                  <div className="border-2 border-dashed border-[#DDD9D0] rounded-xl p-4 text-center hover:border-[#5E734F] transition-colors bg-[#FAF8F5]">
                    <input
                      type="file"
                      id="videoFileInput"
                      required={!newVideo.driveStreamUrl}
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      onChange={(e) => setLocalVideoFile(e.target.files[0] || null)}
                      className="hidden"
                    />
                    <label htmlFor="videoFileInput" className="cursor-pointer block">
                      <UploadCloud className="w-8 h-8 text-[#5E734F] mx-auto mb-2" />
                      {localVideoFile ? (
                        <div>
                          <span className="font-bold text-xs text-[#1A2118] block">{localVideoFile.name}</span>
                          <span className="text-[11px] text-[#7D8876]">
                            {(localVideoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-semibold text-[#1A2118] block">
                            Click to browse video from computer
                          </span>
                          <span className="text-[11px] text-[#7D8876]">
                            MP4, MOV, WebM (Saved to server storage & served directly)
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#3D4C33] uppercase mb-1">External Stream URL</label>
                  <input
                    type="url"
                    required
                    value={newVideo.driveStreamUrl}
                    onChange={(e) => setNewVideo({ ...newVideo, driveStreamUrl: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm"
                    placeholder="https://commondatastorage.googleapis.com/..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#666F60] hover:text-[#1A2118]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingVideo}
                  className="px-5 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploadingVideo ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading to Storage...</span>
                    </>
                  ) : (
                    <span>Deliver Cut to Client</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIGITAL INVOICE VIEWER MODAL (PROPERLY VIEWED BY ADMIN) */}
      {/* ======================================================== */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A2118]/50 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl p-8 rounded-2xl border border-[#DDD9D0] bg-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
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
                  {viewingInvoice.client?.company || viewingInvoice.clientId}
                </div>
                <div className="text-[#5A6354] mt-0.5">Contact: {viewingInvoice.client?.name || 'Authorized Representative'}</div>
                <div className="text-[#5A6354]">Email: {viewingInvoice.client?.email || 'N/A'}</div>
                <div className="text-[#5A6354]">Phone: {viewingInvoice.client?.phone || 'N/A'}</div>
              </div>

              <div className="space-y-1.5 text-right font-mono">
                <div>
                  <span className="text-[#7D8876]">Invoice Date: </span>
                  <span className="font-bold text-[#1A2118]">
                    {viewingInvoice.issueDate || new Date().toISOString().split('T')[0]}
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
                Work Description & Deliverables Specification
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
                onClick={() => handleTriggerPaymentReminders()}
                className="px-4 py-2 rounded-xl bg-[#F4F1EA] hover:bg-[#EAE5DA] text-[#3D4C33] text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-[#5E734F]" />
                Dispatch Twilio SMS Reminder
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setInvoiceToDelete(viewingInvoice)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  Delete Invoice
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl border border-[#DDD9D0] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A2118] flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="px-5 py-2 rounded-xl bg-[#1A2118] hover:bg-[#333D2F] text-white text-xs font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NOTIFICATION PANEL SLIDE-OVER DRAWER (ADMIN) */}
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
                  <h3 className="font-bold text-base text-[#1A2118]">Studio Notifications</h3>
                  <div className="text-[11px] text-[#7D8876]">
                    {unreadNotificationsCount} unread update{unreadNotificationsCount === 1 ? '' : 's'}
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
              <span>Real-time live updates enabled</span>
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

    </div>
  );
};
