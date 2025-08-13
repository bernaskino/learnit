import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import Chat from "@/components/chat";

export default function Home() {
  return (
    <section className="mx-auto h-full w-full md:w-2/3">
      <Chat />
    </section>
  );
}
