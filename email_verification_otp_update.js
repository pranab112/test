// OTP Email Verification Functions
// Add this to your player-dashboard.html

// Helper function to move focus to next OTP input
function moveToNext(current, nextFieldID) {
    if (current.value.length >= current.maxLength) {
        if (nextFieldID) {
            document.getElementById(nextFieldID).focus();
        }
    }
}

// Helper function to get OTP from all 6 inputs
function getOTPCode() {
    let otp = '';
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`otp${i}`);
        if (input) {
            otp += input.value;
        }
    }
    return otp;
}

// Send OTP code to email
async function sendOTPCode() {
    const email = document.getElementById('newEmailInput').value.trim();
    if (!email) {
        showNotification('Please enter an email address', 'error');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/email/send-otp`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            showNotification('Verification code sent to your email!', 'success');
            await loadEmailVerificationStatus(); // Refresh the section to show OTP input
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Failed to send verification code', 'error');
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        showNotification('Error sending verification code', 'error');
    }
}

// Verify the OTP code
async function verifyOTPCode() {
    const otp = getOTPCode();

    if (otp.length !== 6) {
        showNotification('Please enter all 6 digits of the verification code', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/email/verify-otp`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ otp })
        });

        if (response.ok) {
            showNotification('Email verified successfully!', 'success');
            await loadEmailVerificationStatus(); // Refresh to show verified status
            await loadPlatformOffers(); // Refresh offers in case there are email verification bonuses
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Invalid verification code', 'error');
            // Clear OTP inputs on error
            for (let i = 1; i <= 6; i++) {
                const input = document.getElementById(`otp${i}`);
                if (input) input.value = '';
            }
            document.getElementById('otp1').focus();
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        showNotification('Error verifying code', 'error');
    }
}

// Resend OTP code
async function resendOTPCode() {
    try {
        const response = await fetch(`${API_URL}/email/resend-otp`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showNotification('New verification code sent!', 'success');
            // Clear existing OTP inputs
            for (let i = 1; i <= 6; i++) {
                const input = document.getElementById(`otp${i}`);
                if (input) input.value = '';
            }
            if (document.getElementById('otp1')) {
                document.getElementById('otp1').focus();
            }
        } else if (response.status === 429) {
            const error = await response.json();
            showNotification(error.detail || 'Please wait before requesting another code', 'warning');
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Failed to resend code', 'error');
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        showNotification('Error resending code', 'error');
    }
}

// Update the renderEmailVerificationSection function
function renderEmailVerificationSection(status) {
    const section = document.getElementById('emailVerificationSection');

    if (!status.secondary_email) {
        // No email set - show input to add email
        section.innerHTML = `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                <p style="color: #999; margin-bottom: 1rem;">
                    Add a secondary email address to verify your account
                </p>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <input type="email" id="newEmailInput" placeholder="Enter email address"
                           style="flex: 1; padding: 0.75rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,215,0,0.3); border-radius: 5px; color: white;" />
                    <button class="btn btn-primary" onclick="sendOTPCode()">
                        <i class="fas fa-envelope"></i> Send Code
                    </button>
                </div>
            </div>
        `;
    } else if (!status.is_email_verified) {
        // Email set but not verified - show OTP input
        const isPending = status.verification_pending;
        section.innerHTML = `
            <div style="background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.3); padding: 1rem; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-triangle" style="color: #ffc107; font-size: 1.2rem;"></i>
                    <div style="flex: 1;">
                        <strong>Email Verification Pending</strong>
                        <p style="color: #999; margin: 0.5rem 0 0 0;">
                            Email: ${status.secondary_email}
                        </p>
                    </div>
                </div>
                ${isPending ? `
                    <p style="color: #ffc107; margin-bottom: 1rem;">
                        <i class="fas fa-info-circle"></i>
                        A 6-digit verification code was sent to your email.
                    </p>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #ffd700;">Enter Verification Code:</label>
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                            <input type="text" id="otp1" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 24px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,215,0,0.3); border-radius: 5px; color: white;" onkeyup="moveToNext(this, 'otp2')" />
                            <input type="text" id="otp2" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 24px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,215,0,0.3); border-radius: 5px; color: white;" onkeyup="moveToNext(this, 'otp3')" />
                            <input type="text" id="otp3" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 24px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,215,0,0.3); border-radius: 5px; color: white;" onkeyup="moveToNext(this, 'otp4')" />
                            <input type="text" id="otp4" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 24px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,215,0,0.3); border-radius: 5px; color: white;" onkeyup="moveToNext(this, 'otp5')" />
                            <input type="text" id="otp5" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 24px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,215,0,0.3); border-radius: 5px; color: white;" onkeyup="moveToNext(this, 'otp6')" />
                            <input type="text" id="otp6" maxlength="1" style="width: 50px; height: 50px; text-align: center; font-size: 24px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,215,0,0.3); border-radius: 5px; color: white;" />
                        </div>
                        <button class="btn btn-primary" onclick="verifyOTPCode()" style="margin-right: 1rem;">
                            <i class="fas fa-check"></i> Verify Code
                        </button>
                        <button class="btn btn-secondary" onclick="resendOTPCode()">
                            <i class="fas fa-redo"></i> Resend Code
                        </button>
                    </div>
                ` : `
                    <button class="btn btn-primary" onclick="resendOTPCode()">
                        <i class="fas fa-paper-plane"></i> Send Verification Code
                    </button>
                `}
            </div>
        `;
    } else {
        // Email verified
        section.innerHTML = `
            <div style="background: rgba(40,167,69,0.1); border: 1px solid rgba(40,167,69,0.3); padding: 1rem; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <i class="fas fa-check-circle" style="color: #28a745; font-size: 1.2rem;"></i>
                    <div>
                        <strong>Email Verified</strong>
                        <p style="color: #999; margin: 0.5rem 0 0 0;">
                            Email: ${status.secondary_email}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
}