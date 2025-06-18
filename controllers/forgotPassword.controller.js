require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const modelOTP = require('../models/otp.model');
const UserModel = require('../models/user.model');

// Cấu hình nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Hàm tạo mã OTP
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// Mã hóa OTP
const hashOTP = async (otp) => bcrypt.hash(otp, 10);

// So sánh OTP
const verifyOTP = async (inputOTP, hashedOTP) => bcrypt.compare(inputOTP, hashedOTP);

// Thêm hàm cleanup
const cleanupExpiredOTPs = async () => {
  try {
    await modelOTP.deleteMany({ otpExpire: { $lt: new Date() } });
  } catch (error) {
    console.error('Lỗi khi cleanup OTP:', error);
  }
};

// API gửi mã OTP
const sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email không được để trống' });
  }

  try {
    // Cleanup expired OTPs first
    await cleanupExpiredOTPs();

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại' });
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await modelOTP.updateOne(
      { email },
      { email, otp: hashedOtp, otpExpire },
      { upsert: true }
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Mã xác nhận quên mật khẩu',
      text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 5 phút.`,
    });

    res.status(200).json({
      status: 200,
      message: "Mã OTP đã được gửi đến email",
    });

  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    res.status(500).json({ message: 'Lỗi khi gửi OTP' });
  }
};

// API xác minh OTP
const checkOtpValidity = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email và OTP không được để trống' });
  }

  try {
    // Cleanup expired OTPs first
    await cleanupExpiredOTPs();

    const otpRecord = await modelOTP.findOne({ email });
    if (!otpRecord || new Date() > otpRecord.otpExpire) {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }

    const isValid = await verifyOTP(otp, otpRecord.otp);
    if (!isValid) {
      return res.status(400).json({ message: 'OTP không chính xác' });
    }

    res.status(200).json({
      status: 200,
      message: "OTP hợp lệ",
    });

  } catch (error) {
    console.error('Lỗi xác minh OTP:', error);
    res.status(500).json({ message: 'Lỗi khi xác minh OTP' });
  }
};

// API reset mật khẩu
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Thiếu thông tin cần thiết' });
  }

  try {
    // Cleanup expired OTPs first
    await cleanupExpiredOTPs();

    const otpRecord = await modelOTP.findOne({ email });
    if (!otpRecord || new Date() > otpRecord.otpExpire) {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }

    const isValid = await verifyOTP(otp, otpRecord.otp);
    if (!isValid) {
      return res.status(400).json({ message: 'OTP không chính xác' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updateOne({ email }, { password: hashedPassword });

    await modelOTP.deleteOne({ email });

    res.status(200).json({
      status: 200,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu' });
  }
};

// API xóa OTP
const deleteOtp = async (req, res) => {
  try {
    const result = await modelOTP.findOneAndDelete({ email: req.params.email });
    if (result) {
      res.status(200).json({status: 200, message: 'Xóa OTP thành công' });
    } else {
      res.status(404).json({status: 404, message: 'Không tìm thấy OTP' });
    }
  } catch (error) {
    console.error('Lỗi xóa OTP:', error);
    res.status(500).json({ message: 'Lỗi khi xóa OTP' });
  }
};

module.exports = { sendOtp, checkOtpValidity, resetPassword, deleteOtp };
