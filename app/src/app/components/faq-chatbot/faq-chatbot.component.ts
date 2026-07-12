import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FAQ_ENTRIES, FaqEntry } from '../../constants/faq-data';

interface ChatMessage {
  from: 'user' | 'bot';
  text: string;
}

@Component({
  selector: 'app-faq-chatbot',
  templateUrl: './faq-chatbot.component.html',
  styleUrls: ['./faq-chatbot.component.css'],
})
export class FaqChatbotComponent {
  @ViewChild('messageList') private messageList?: ElementRef;

  isOpen = false;
  messages: ChatMessage[] = [
    { from: 'bot', text: "Hi! Ask me anything about HiYrNow and I'll do my best to help." },
  ];
  userInput = '';
  showEscalationForm = false;
  escalationName = '';
  escalationEmail = '';
  escalationQuestion = '';
  isSubmitting = false;



  constructor(private http: HttpClient) {}

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.scrollToBottom();
    }
  }

  sendMessage(): void {
    const input = this.userInput.trim();
    if (!input) return;

    this.messages.push({ from: 'user', text: input });
    this.userInput = '';
    this.showEscalationForm = false;
    this.scrollToBottom();

    const match = this.findMatch(input);
    if (match) {
      this.messages.push({ from: 'bot', text: match.answer });
    } else {
      this.messages.push({
        from: 'bot',
        text: "I don't have an answer for that yet. Fill in the form below and our team will get back to you.",
      });
      this.escalationQuestion = input;
      this.showEscalationForm = true;
    }
    this.scrollToBottom();
  }

  // Part C — keyword matching
  private findMatch(input: string): FaqEntry | null {
    const normalised = input.toLowerCase().trim();
    let bestEntry: FaqEntry | null = null;
    let bestScore = 0;

    for (const entry of FAQ_ENTRIES) {
      const score = entry.keywords.filter(kw => normalised.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    return bestScore > 0 ? bestEntry : null;
  }

  submitEscalation(): void {
    if (!this.escalationName.trim() || !this.escalationEmail.trim()) return;
    this.isSubmitting = true;

    this.http
      .post(
        `/api/chatbot/escalate`,
        {
          question: this.escalationQuestion,
          name: this.escalationName.trim(),
          email: this.escalationEmail.trim(),
        },
        { withCredentials: true }
      )
      .subscribe({
        next: () => {
          this.showEscalationForm = false;
          this.escalationName = '';
          this.escalationEmail = '';
          this.escalationQuestion = '';
          this.isSubmitting = false;
          this.messages.push({ from: 'bot', text: 'Our team will get back to you shortly.' });
          this.scrollToBottom();
        },
        error: () => {
          this.isSubmitting = false;
          this.messages.push({
            from: 'bot',
            text: 'Sorry, something went wrong. Please try again or email us at info@hiyrnow.in.',
          });
          this.scrollToBottom();
        },
      });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageList?.nativeElement) {
        this.messageList.nativeElement.scrollTop =
          this.messageList.nativeElement.scrollHeight;
      }
    }, 0);
  }
}
