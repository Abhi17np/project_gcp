import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { FaqChatbotComponent } from './faq-chatbot.component';

describe('FaqChatbotComponent', () => {
  let component: FaqChatbotComponent;
  let fixture: ComponentFixture<FaqChatbotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FaqChatbotComponent],
      imports: [HttpClientTestingModule, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FaqChatbotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start closed', () => {
    expect(component.isOpen).toBeFalse();
  });

  it('should open on toggle', () => {
    component.toggle();
    expect(component.isOpen).toBeTrue();
  });

  it('should return a matched FAQ answer', () => {
    component.userInput = 'is hiyrnow free for job seekers no cost';
    component.sendMessage();
    const last = component.messages[component.messages.length - 1];
    expect(last.from).toBe('bot');
    expect(last.text).toContain('browse jobs');
  });

  it('should trigger escalation form on no match', () => {
    component.userInput = 'xyzzy unrecognised gibberish query';
    component.sendMessage();
    expect(component.showEscalationForm).toBeTrue();
  });
});
