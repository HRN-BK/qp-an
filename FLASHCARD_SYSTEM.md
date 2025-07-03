# Hệ Thống Flashcard Đã Được Làm Lại

## Tổng Quan

Tôi đã làm lại hoàn toàn hệ thống flashcard để đơn giản hóa và cải thiện trải nghiệm người dùng. Hệ thống mới tập trung vào việc học từ vựng hiệu quả với giao diện dễ sử dụng.

## Tính Năng Chính

### 1. Giao Diện Flashcard Mới
- **Card 2 mặt**: Mặt trước hiển thị từ tiếng Anh, mặt sau hiển thị nghĩa tiếng Việt
- **Thiết kế đẹp**: Card có độ cao cố định (500px), hover effects, và màu sắc phân biệt theo cấp độ CEFR
- **Audio tích hợp**: Nút phát âm để nghe cách đọc từ
- **Hệ thống đánh giá 3 cấp độ**:
  - 😞 **Hard** (1 điểm): Không biết từ - ôn lại sau 1 ngày
  - 😊 **Good** (2 điểm): Mất thời gian suy nghĩ - ôn lại sau 3 ngày  
  - ❤️ **Easy** (3 điểm): Biết ngay - ôn lại sau 7 ngày

### 2. Thanh Tiến Trình Chi Tiết
- Hiển thị thẻ hiện tại / tổng số thẻ
- Số thẻ đã ôn và số thẻ trả lời đúng
- Thanh tiến trình trực quan
- Nút Reset để bắt đầu lại session

### 3. Điều Hướng Dễ Dàng
- Nút Previous/Next để chuyển thẻ
- Hiển thị Mastery Level và ngày ôn tiếp theo
- Nút nhanh về Home, Vocabulary List, và Refresh

### 4. API Đơn Giản
- Endpoint mới: `/api/vocab/simple-review`
- Chỉ cần truyền `vocabularyId` và `rating` (1-3)
- Tự động tính toán ngày ôn tiếp theo
- Tương thích với cả UUID và integer ID

## Cách Sử Dụng

### Bước 1: Truy Cập Flashcards
```
http://localhost:3000/flashcards
```

### Bước 2: Ôn Từ Vựng
1. Đọc từ tiếng Anh trên thẻ
2. Suy nghĩ về nghĩa tiếng Việt
3. Nhấn "Show Answer" để xem đáp án
4. Đánh giá mức độ hiểu biết:
   - **Hard**: Nếu bạn không biết hoặc trả lời sai
   - **Good**: Nếu bạn biết nhưng mất thời gian suy nghĩ
   - **Easy**: Nếu bạn biết ngay lập tức

### Bước 3: Hoàn Thành Session
- Sau khi ôn hết các thẻ, hệ thống sẽ thông báo hoàn thành
- Danh sách từ sẽ tự động refresh để lấy thẻ mới cần ôn

## Thuật Toán Spaced Repetition

Hệ thống sử dụng thuật toán đơn giản nhưng hiệu quả:

- **Hard (1)**: Ôn lại sau 1 ngày
- **Good (2)**: Ôn lại sau 3 ngày
- **Easy (3)**: Ôn lại sau 7 ngày

Từ vựng chỉ xuất hiện trong danh sách ôn khi đến thời gian được lên lịch.

## Cải Tiến So Với Hệ Thống Cũ

### ✅ Ưu Điểm Mới
- Giao diện đơn giản, dễ hiểu
- Tương thích với mọi định dạng ID database
- API ổn định, ít lỗi
- Tập trung vào trải nghiệm học tập
- Thiết kế responsive cho mobile

### ❌ Loại Bỏ
- Game mode phức tạp với nhiều loại câu hỏi
- Auto-save sessions phức tạp
- SRS library dependency
- Multiple activity types
- Quiz completion components

## Files Chính

### Frontend
- `/src/app/flashcards/page.tsx` - Trang chính flashcard
- `/src/components/FlashCard.tsx` - Component thẻ từ vựng

### Backend  
- `/src/app/api/vocab/simple-review/route.ts` - API đánh giá đơn giản
- `/src/app/api/vocab/due/route.ts` - API lấy từ cần ôn

### Styling
- Sử dụng Tailwind CSS với màu sắc phân biệt theo CEFR level
- Responsive design cho mobile và desktop
- Hover effects và animations mượt mà

## Lưu Ý Kỹ Thuật

1. **Database Compatibility**: API tự động handle cả UUID và integer ID
2. **Error Handling**: Có fallback cho các trường không tồn tại trong database
3. **Audio Integration**: Tích hợp với hệ thống audio hiện có
4. **Session Management**: Tự động refresh danh sách khi hoàn thành

Hệ thống flashcard mới này đơn giản hơn nhưng hiệu quả hơn, tập trung vào mục tiêu chính là giúp người dùng học từ vựng một cách có hệ thống và khoa học.
