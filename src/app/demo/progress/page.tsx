"use client"

import { ProgressBar } from "@/components/ProgressBar"

export default function ProgressDemo() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Demo Thanh Tiến Trình</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Ví dụ cơ bản - 11/15</h2>
          <ProgressBar current={11} total={15} />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Với phần trăm</h2>
          <ProgressBar current={11} total={15} showPercentage />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Các kích thước khác nhau</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Nhỏ (sm)</p>
              <ProgressBar current={11} total={15} size="sm" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Vừa (md) - mặc định</p>
              <ProgressBar current={11} total={15} size="md" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Lớn (lg)</p>
              <ProgressBar current={11} total={15} size="lg" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Các màu sắc khác nhau</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Mặc định</p>
              <ProgressBar current={8} total={15} variant="default" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Thành công (success)</p>
              <ProgressBar current={14} total={15} variant="success" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Cảnh báo (warning)</p>
              <ProgressBar current={7} total={15} variant="warning" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Nguy hiểm (danger)</p>
              <ProgressBar current={3} total={15} variant="danger" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Không hiển thị label</h2>
          <ProgressBar current={11} total={15} showLabel={false} />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Ví dụ thực tế - Quiz Progress</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-medium mb-4">Tiến trình Quiz</h3>
            <ProgressBar 
              current={11} 
              total={15} 
              showPercentage 
              variant="success" 
              size="lg"
            />
            <p className="text-sm text-gray-600 mt-2">
              Bạn đã trả lời đúng 11 trên 15 câu hỏi (73%)
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Ví dụ học từ vựng</h2>
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-medium mb-4">Từ vựng đã học</h3>
            <ProgressBar 
              current={11} 
              total={15} 
              showPercentage 
              variant="default" 
              size="md"
            />
            <p className="text-sm text-gray-600 mt-2">
              Bạn đã hoàn thành 11/15 từ vựng trong bài học này
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
