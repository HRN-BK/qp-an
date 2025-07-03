# 📚 QUIZ SYSTEM & SPACED REPETITION - TÀI LIỆU HỆ THỐNG

## 🎯 TỔNG QUAN HỆ THỐNG

### **Chức năng chính:**
1. **Quiz Game**: 4 chế độ quiz khác nhau
2. **Spaced Repetition**: Hệ thống lặp lại cách quãng thông minh
3. **Auto-save**: Tự động lưu tiến trình mỗi 30 giây
4. **Detailed Results**: Báo cáo chi tiết với phân tích từng từ

---

## 🎮 CHẾ ĐỘ QUIZ (4 MODES)

### 1. **🎧 LISTENING MODE**
- **Mô tả**: Nghe phát âm và chọn từ đúng
- **Cách hoạt động**: 
  - Phát âm audio/TTS của từ vựng
  - Hiển thị 4 lựa chọn từ khác nhau
  - Người dùng chọn từ đúng
- **Kỹ năng rèn luyện**: Khả năng nghe và nhận biết từ

### 2. **🔤 TRANSLATION MODE**
- **Mô tả**: Dịch từ Tiếng Việt sang Tiếng Anh
- **Cách hoạt động**:
  - Hiển thị nghĩa tiếng Việt
  - Người dùng gõ từ tiếng Anh
  - Kiểm tra chính xác (không phân biệt hoa thường)
- **Kỹ năng rèn luyện**: Nhớ từ vựng và chính tả

### 3. **📝 SYNONYM MODE**
- **Mô tả**: Chọn từ đồng nghĩa hoặc nghĩa đúng
- **Cách hoạt động**:
  - Hiển thị từ gốc
  - 4 lựa chọn: từ đồng nghĩa hoặc nghĩa
  - Chọn đáp án đúng
- **Kỹ năng rèn luyện**: Hiểu nghĩa sâu và mối quan hệ từ

### 4. **✏️ FILL BLANK MODE**
- **Mô tả**: Điền từ vào chỗ trống trong câu
- **Cách hoạt động**:
  - Hiển thị câu với từ bị ẩn bằng "______"
  - Gợi ý: Nghĩa tiếng Việt + định nghĩa tiếng Anh
  - Người dùng gõ từ đúng
- **Kỹ năng rèn luyện**: Sử dụng từ trong ngữ cảnh

---

## 🔄 SPACED REPETITION SYSTEM

### **Nguyên lý hoạt động:**

#### **Mastery Level (0-5):**
- **Level 0**: Từ mới/chưa học
- **Level 1-2**: Đang học, cần ôn thường xuyên
- **Level 3-4**: Đã thuộc, ôn định kỳ
- **Level 5**: Thành thạo, ôn sau 3 tháng

#### **Review Queue System:**
- Từ trả lời **SAI** → Xuất hiện lại sau **3-10 câu**
- Từ trả lời **ĐÚNG** → Tăng mastery level
- Từ sai **2 lần liên tiếp** → Giảm mastery level

#### **Adaptive Algorithm:**
```
if (isCorrect) {
  masteryLevel = min(5, masteryLevel + 1)
  nextReview = calculateSpacedInterval(masteryLevel)
} else {
  addToReviewQueue(3-10 positions ahead)
  if (consecutiveWrong >= 2) {
    masteryLevel = max(0, masteryLevel - 1)
  }
}
```

---

## 💾 HỆ THỐNG LƯU DỮ LIỆU

### **Auto-save mỗi 30 giây:**
- Tiến trình hiện tại
- Kết quả từng câu
- Session ID
- Điểm số và streak

### **Lưu sau mỗi câu trả lời:**
- Vocabulary ID
- Activity Type (listening/translation/synonym/fill_blank)
- Is Correct (true/false)
- Response Time (milliseconds)
- User Answer
- Session ID

### **API Endpoints sử dụng:**
- `POST /api/vocab/review` - Cập nhật mastery level
- `POST /api/quiz/progress` - Lưu tiến trình quiz
- `POST /api/stats/activity` - Ghi nhận hoạt động học

---

## 📊 SAU KHI HOÀN THÀNH QUIZ

### **QuizResultsDetail Component - Báo cáo chi tiết:**

#### **1. Thống kê tổng quan:**
- **Tổng câu hỏi**: Số câu đã làm
- **Câu đúng**: Số câu trả lời chính xác (màu xanh)
- **Câu sai**: Số câu trả lời sai (màu đỏ)
- **Thời gian trung bình**: Thời gian phản hồi TB/câu
- **Độ chính xác**: Phần trăm đúng với thanh progress

#### **2. Phân loại hiệu suất:**
- **≥80%**: 🎉 "Xuất sắc!" (Badge xanh)
- **60-79%**: 👍 "Tốt!" (Badge vàng)
- **<60%**: 💪 "Cần cải thiện!" (Badge đỏ)

#### **3. Chi tiết từ đúng/sai:**

**Khi bấm "Từ trả lời đúng (X)":**
- Hiển thị danh sách từ đã trả lời đúng
- Mỗi từ có:
  - Tên từ + nút phát âm 🔊
  - Nghĩa tiếng Việt
  - Loại quiz (🎧 Nghe, 🔤 Dịch, 📝 Đồng nghĩa, ✏️ Điền từ)
  - Thời gian phản hồi
  - CEFR level badge

**Khi bấm "Từ trả lời sai (X)":**
- Hiển thị danh sách từ đã trả lời sai
- Mỗi từ có:
  - Tên từ + nút phát âm 🔊
  - Nghĩa tiếng Việt
  - **Đáp án của bạn**: "Bạn trả lời: 'wrong_answer'"
  - Loại quiz và thời gian phản hồi
  - CEFR level badge (màu đỏ)

#### **4. Hành động sau quiz:**
- **"Học lại"**: Reset và bắt đầu lại với cùng bộ từ
- **"Tiếp tục"**: Quay về trang chính, cập nhật dữ liệu

---

## 🔄 QUY TRÌNH HỌC HOÀN CHỈNH

### **1. Bắt đầu:**
```
User → Flashcards page → StudyGame loads due vocabularies
```

### **2. Trong quiz:**
```
For each word:
  1. Random select mode (listening/translation/synonym/fill_blank)
  2. Generate question + options
  3. User answers
  4. Calculate response time
  5. Auto-save progress every 30s
  6. Show ResultCard with feedback
  7. Update mastery level via API
  8. Add wrong answers to review queue
```

### **3. Kết thúc quiz:**
```
All words completed → QuizResultsDetail → Show statistics
User clicks "Continue" → Save final results → Return to home
```

### **4. Data persistence:**
```
- Quiz sessions saved to database
- Individual results tracked
- Mastery levels updated
- Next review times calculated
- Study statistics aggregated
```

---

## 🎯 GỢI Ý NÂNG CẤP

### **1. Advanced Analytics:**
- Biểu đồ tiến bộ theo thời gian
- Phân tích điểm yếu theo từng skill
- So sánh với người dùng khác

### **2. Personalization:**
- AI điều chỉnh độ khó theo năng lực
- Gợi ý từ vựng mới dựa trên sở thích
- Lộ trình học cá nhân hóa

### **3. Gamification:**
- Hệ thống điểm XP và level
- Achievements và badges
- Leaderboard và challenges

### **4. Social Features:**
- Chia sẻ kết quả học
- Học nhóm và thi đấu
- Trao đổi với cộng đồng

### **5. Advanced Modes:**
- Speed round (thời gian giới hạn)
- Endless mode (học không giới hạn)
- Custom quiz (tạo bộ đề riêng)
- Voice recognition (nhận diện giọng nói)

---

## 📱 RESPONSIVE & ACCESSIBILITY

### **Mobile-first design:**
- Tối ưu cho màn hình nhỏ
- Touch-friendly buttons
- Swipe gestures support

### **Accessibility features:**
- Screen reader support
- Keyboard navigation
- High contrast colors
- Clear audio feedback

---

## 🔧 TECHNICAL IMPLEMENTATION

### **Frontend:**
- React + TypeScript
- Custom hooks for game logic
- Auto-save with useQuizAutoSave
- Progressive Web App ready

### **Backend:**
- Next.js API routes
- Supabase database
- Real-time data sync
- Error handling và retry logic

### **Performance:**
- Lazy loading components
- Optimized audio loading
- Efficient state management
- Caching strategies
