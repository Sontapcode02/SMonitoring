import React, { useState, useEffect } from 'react';
import { useAuth, User } from '../context/AuthContext';

export const UserManagement: React.FC = () => {
  const { getAuthHeaders, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // New User Modal Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newConfirmPassword, setNewConfirmPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<'admin' | 'operator' | 'viewer'>('viewer');
  
  // Expiration presets: 'never' | '30' | '60' | '90' | '365' | 'custom'
  const [expirationPreset, setExpirationPreset] = useState<string>('never');
  const [customDate, setCustomDate] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/users', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setErrorMsg('');
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || 'Không thể tải danh sách tài khoản.');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newConfirmPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ Tên đăng nhập, Mật khẩu và Xác nhận mật khẩu.');
      return;
    }

    if (newPassword !== newConfirmPassword) {
      setErrorMsg('Mật khẩu khởi tạo và Mật khẩu xác nhận không khớp nhau!');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');
    setSuccessMsg('');

    let payload: any = {
      username: newUsername,
      password: newPassword,
      full_name: newFullName,
      role: newRole
    };

    if (expirationPreset === '30' || expirationPreset === '60' || expirationPreset === '90' || expirationPreset === '365') {
      payload.expires_in_days = Number(expirationPreset);
    } else if (expirationPreset === 'custom' && customDate) {
      payload.expires_at = new Date(customDate).toISOString();
    } else {
      payload.expires_in_days = null;
    }

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Tạo tài khoản '${newUsername}' thành công!`);
        setShowAddModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewConfirmPassword('');
        setNewFullName('');
        setNewRole('viewer');
        setExpirationPreset('never');
        setCustomDate('');
        fetchUsers();
      } else {
        setErrorMsg(data.detail || 'Tạo tài khoản thất bại.');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ khi tạo tài khoản.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async (userId: number, role: string) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        setSuccessMsg('Cập nhật quyền tài khoản thành công!');
        fetchUsers();
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || 'Cập nhật thất bại.');
      }
    } catch (err) {
      setErrorMsg('Lỗi máy chủ.');
    }
  };

  const handleToggleStatus = async (userId: number) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(data.message);
        fetchUsers();
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || 'Thao tác thất bại.');
      }
    } catch (err) {
      setErrorMsg('Lỗi máy chủ.');
    }
  };

  const formatExpiration = (expires_at?: string | null) => {
    if (!expires_at) {
      return <span style={{ color: '#34d399', fontWeight: 600 }}>Vĩnh viễn (Never)</span>;
    }
    const expDate = new Date(expires_at);
    const isExpired = expDate.getTime() < Date.now();
    if (isExpired) {
      return (
        <span style={{ color: '#fb7185', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)' }}>
          ⚠️ Đã hết hạn ({expDate.toLocaleDateString('vi-VN')})
        </span>
      );
    }
    return (
      <span style={{ color: '#60a5fa', fontWeight: 600 }}>
        {expDate.toLocaleDateString('vi-VN')}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '20px 24px',
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Quản Lý Tài Khoản & Phân Quyền RBAC</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Phân cấp người dùng chuẩn ISO/IEC 27001 (Admin, Operator, Viewer) & Thời hạn truy cập
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchUsers}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Làm mới
          </button>
          <button
            onClick={() => { setShowAddModal(true); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #ff9830, #f2495c)',
              border: 'none',
              color: 'white',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 152, 48, 0.3)'
            }}
          >
            Thêm Tài Khoản Mới
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', fontSize: '13px', marginBottom: '20px' }}>
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '13px', marginBottom: '20px' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Users Table */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 18px', fontWeight: 600 }}>Tài Khoản</th>
              <th style={{ padding: '14px 18px', fontWeight: 600 }}>Họ & Tên</th>
              <th style={{ padding: '14px 18px', fontWeight: 600 }}>Thời Hạn Truy Cập</th>
              <th style={{ padding: '14px 18px', fontWeight: 600 }}>Phân Quyền (Role)</th>
              <th style={{ padding: '14px 18px', fontWeight: 600 }}>Trạng Thái</th>
              <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Đang tải danh sách tài khoản...
                </td>
              </tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 800, fontSize: '13px'
                    }}>
                      {u.username.substring(0, 1).toUpperCase()}
                    </div>
                    <span>{u.username}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                  {u.full_name || 'N/A'}
                </td>
                <td style={{ padding: '14px 18px' }}>
                  {formatExpiration(u.expires_at)}
                </td>
                <td style={{ padding: '14px 18px' }}>
                  <select
                    value={u.role}
                    disabled={u.username === 'admin'}
                    onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                    style={{
                      background: u.username === 'admin' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(0, 0, 0, 0.4)',
                      border: u.username === 'admin' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-color)',
                      color: u.username === 'admin' ? '#fb7185' : 'var(--text-primary)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: u.username === 'admin' ? 'not-allowed' : 'pointer',
                      fontWeight: u.username === 'admin' ? 700 : 400
                    }}
                    title={u.username === 'admin' ? 'Tài khoản Admin gốc hệ thống không thể thay đổi vai trò' : ''}
                  >
                    <option value="admin">ADMIN</option>
                    <option value="operator">OPERATOR</option>
                    <option value="viewer">VIEWER</option>
                  </select>
                </td>
                <td style={{ padding: '14px 18px' }}>
                  {u.is_active ? (
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '12px' }}>
                      Hoạt động
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '12px' }}>
                      Đã khóa
                    </span>
                  )}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleToggleStatus(u.id)}
                    disabled={currentUser?.id === u.id || u.username === 'admin'}
                    title={u.username === 'admin' ? 'Tài khoản Admin gốc hệ thống không thể bị khóa' : ''}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: u.is_active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: u.is_active ? '#f87171' : '#34d399',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: (currentUser?.id === u.id || u.username === 'admin') ? 'not-allowed' : 'pointer',
                      opacity: (currentUser?.id === u.id || u.username === 'admin') ? 0.5 : 1
                    }}
                  >
                    {u.is_active ? 'Khóa Tài Khoản' : 'Mở Khóa'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            width: '480px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Tạo Tài Khoản Mới</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Tên đăng nhập (Username) <span style={{ color: '#fb7185' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="vd: operator_02"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Họ và tên</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Mật khẩu khởi tạo <span style={{ color: '#fb7185' }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Xác nhận mật khẩu <span style={{ color: '#fb7185' }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newConfirmPassword}
                    onChange={(e) => setNewConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)',
                      border: (newConfirmPassword && newPassword !== newConfirmPassword) ? '1px solid #fb7185' : '1px solid var(--border-color)',
                      color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {newConfirmPassword && newPassword !== newConfirmPassword && (
                <div style={{ fontSize: '11px', color: '#fb7185', marginTop: '-8px', marginBottom: '12px' }}>
                  ⚠️ Mật khẩu xác nhận không khớp!
                </div>
              )}

              {/* Expiration Options */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Ngày hết hạn tài khoản (Account Expiration)
                </label>

                {/* Quick Select Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                  {[
                    { key: '30', label: '30 Ngày' },
                    { key: '60', label: '60 Ngày' },
                    { key: '90', label: '90 Ngày' },
                    { key: '365', label: '1 Năm' },
                    { key: 'never', label: 'Không Hết Hạn' },
                    { key: 'custom', label: 'Tùy Chọn Ngày' }
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setExpirationPreset(opt.key)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: expirationPreset === opt.key ? 700 : 500,
                        background: expirationPreset === opt.key ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                        border: expirationPreset === opt.key ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                        color: expirationPreset === opt.key ? '#38bdf8' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Input */}
                {expirationPreset === 'custom' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        background: 'rgba(0,0,0,0.4)', border: '1px solid #38bdf8',
                        color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Phân quyền (Role)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="admin">👑 ADMIN (Full Access)</option>
                  <option value="operator">🛠 OPERATOR (Ops & Resolve Alerts)</option>
                  <option value="viewer">👁 VIEWER (Read-Only Auditor)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating || (Boolean(newConfirmPassword) && newPassword !== newConfirmPassword)}
                  style={{
                    padding: '10px 20px', borderRadius: '6px',
                    background: (newConfirmPassword && newPassword !== newConfirmPassword) ? '#475569' : 'linear-gradient(135deg, #ff9830, #f2495c)',
                    border: 'none', color: 'white', fontWeight: 700,
                    cursor: (newConfirmPassword && newPassword !== newConfirmPassword) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isCreating ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
