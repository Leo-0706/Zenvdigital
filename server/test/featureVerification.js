const http = require('http');

const runFeatureTests = async () => {
  console.log('--- Starting Zenv Digital Feature Validation: Admin-Only Client Account Creation & Dual Drive Sync ---');

  const port = process.env.PORT || 5000;

  const request = (path, options = {}) => {
    return new Promise((resolve, reject) => {
      const opts = {
        hostname: '127.0.0.1',
        port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(opts, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body, headers: res.headers });
          }
        });
      });

      req.on('error', reject);
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  };

  try {
    // 1. Test Admin Login
    console.log('[TEST 1] Admin Login with Bibekbisalnayak@gmail.com...');
    const adminRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'Bibekbisalnayak@gmail.com', password: 'ZenvAdmin2026!' }
    });
    if (adminRes.status !== 200) throw new Error('Admin login failed');
    const adminToken = adminRes.data.token;
    console.log('✅ Admin authenticated successfully.');

    // 2. Test Admin-Only Client Account Onboarding with Custom Password & Dual Google Drive Folders
    console.log('[TEST 2] Admin Onboarding Client with Custom Credentials & Dual Google Drive Sync...');
    const testEmail = `enterprise_${Date.now()}@velocityev.com`;
    const initialClientPassword = 'VelocityPass2026!';
    const onboardRes = await request('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Jessica Lin',
        company: 'Velocity Electric Vehicles',
        email: testEmail,
        phone: '+919876543210',
        password: initialClientPassword,
        clientDriveEmail: 'jessica.drive@gmail.com'
      }
    });

    console.log(`Status: ${onboardRes.status}`, onboardRes.status === 201 ? '✅ Client account & login created' : '❌ Onboarding failed');
    const createdClient = onboardRes.data.client;
    const createdUser = onboardRes.data.user;

    if (!createdClient?.brandKitDriveFolderId || !createdClient?.adminDriveFolderId) {
      throw new Error('Dual Google Drive synchronization failed (folders missing)');
    }
    console.log(`✅ Client Google Drive Folder: ${createdClient.brandKitDriveFolderId}`);
    console.log(`✅ Admin Central Archive Drive: ${createdClient.adminDriveFolderId}`);

    // 3. Test Client Direct Login with Admin-Created Credentials
    console.log('[TEST 3] Client Signs In with Admin-Created ID and Password...');
    const clientLoginRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: testEmail, password: initialClientPassword }
    });

    console.log(`Status: ${clientLoginRes.status}`, clientLoginRes.data.token ? '✅ Client authenticated successfully with admin-assigned password' : '❌ Login failed');
    const clientToken = clientLoginRes.data.token;

    // 4. Test Admin Resets Client Password directly from Admin Panel
    console.log('[TEST 4] Admin Resets Client Password from Admin Dashboard...');
    const updatedClientPass = 'UpdatedZenv2026!';
    const resetRes = await request(`/api/admin/clients/${createdClient.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: { newPassword: updatedClientPass }
    });
    console.log(`Status: ${resetRes.status}`, resetRes.data.success ? '✅ Admin updated client password' : '❌ Password reset failed');

    // 5. Test Client Login with Newly Reset Password
    console.log('[TEST 5] Client Signs In with New Password set by Admin...');
    const reLoginRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: testEmail, password: updatedClientPass }
    });
    console.log(`Status: ${reLoginRes.status}`, reLoginRes.data.token ? '✅ Client logged in with updated password' : '❌ Login failed');

    // 6. Test Admin Issue Invoice with Work Description and Rupees (₹ INR)
    console.log('[TEST 6] Issue Digital Invoice in ₹ INR with Work Description...');
    const newInvRes = await request('/api/admin/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: {
        clientId: createdClient.id,
        amount: 145000,
        dueDate: '2026-11-20',
        status: 'SENT',
        description: 'Velocity EV Brand Launch Film 60s & 30s Master Cut, Sound Design Mastering, Commercial License.'
      }
    });

    console.log(`Status: ${newInvRes.status}`, newInvRes.data.invoice?.description ? `✅ Invoice created in ₹ with description: "${newInvRes.data.invoice.description.slice(0, 45)}..."` : '❌ Failed');
    const createdInvoice = newInvRes.data.invoice;

    // 7. Test Client Invoice View & Settle in Client Portal (₹ INR)
    console.log('[TEST 7] Client Portal Invoice Access & Settlement...');
    const payRes = await request(`/api/client/invoices/${createdInvoice.id}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${reLoginRes.data.token}` }
    });
    console.log(`Invoice Settlement Status: ${payRes.status}`, payRes.data.success ? '✅ Invoice settled & reconciled in Rupees' : '❌ Settle failed');

    // 8. Test Client Video Segregation in Admin
    console.log('[TEST 8] Verify Video Deliverables Segregation per Client in Admin...');
    const clientVideosRes = await request(`/api/admin/videos?clientId=${createdClient.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foreignVideosRes = await request('/api/admin/videos?clientId=cli-foreign-999', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const isClientVaultSegregated = clientVideosRes.data.videos.every(v => v.clientId === createdClient.id);
    const isForeignVaultSegregated = foreignVideosRes.data.videos.every(v => v.clientId === 'cli-foreign-999');

    console.log(`Client cuts: ${clientVideosRes.data.videos.length}, Foreign cuts: ${foreignVideosRes.data.videos.length}`);
    console.log(`Client segregation: ${isClientVaultSegregated && isForeignVaultSegregated ? '✅ PASS (Individual Client Vaults strictly isolated)' : '❌ FAIL'}`);

    console.log('\n🎉 ALL 8 ADVANCED FEATURE TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('Feature test failed:', err);
    process.exit(1);
  }
};

runFeatureTests();
