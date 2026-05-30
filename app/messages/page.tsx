import ChatWindow from '../components/ChatWindow'
import Sidebar from '../components/Sidebar'

export default function MessagesPage() {
  return (
    <div className="flex h-dvh overflow-hidden bg-[#f0f2f5]">
      <Sidebar />
      <main className="flex flex-1 min-w-0 sm:ml-[72px]">
        <ChatWindow />
      </main>
    </div>
  )
}