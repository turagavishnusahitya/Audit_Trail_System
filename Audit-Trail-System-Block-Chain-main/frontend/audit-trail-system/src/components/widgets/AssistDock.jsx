import FeedbackWidget from './FeedbackWidget';
import SupportBotWidget from './SupportBotWidget';

export default function AssistDock() {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      <FeedbackWidget />
      <SupportBotWidget />
    </div>
  );
}
