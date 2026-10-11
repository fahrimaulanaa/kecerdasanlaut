import React from "react";

export function ModelBrandLogo({ modelId, className = "w-4 h-4" }: { modelId: string; className?: string }) {
  const id = modelId.toLowerCase();

  // Anthropic Claude
  if (id.includes("claude")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#D97706" fillOpacity="0.12" />
        <path
          d="M13.8 6.5L18 17.5H15.4L14.4 14.8H9.6L8.6 17.5H6L10.2 6.5H13.8ZM13.5 12.6L12 8.6L10.5 12.6H13.5Z"
          fill="#D97706"
        />
      </svg>
    );
  }

  // OpenAI GPT
  if (id.includes("gpt")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#10A37F" fillOpacity="0.12" />
        <path
          d="M19 10.6a4.2 4.2 0 0 0-.4-2.8 4.3 4.3 0 0 0-3.7-2.1c-.3 0-.6 0-.9.1A4.2 4.2 0 0 0 10.5 4a4.3 4.3 0 0 0-4.1 2.9 4.2 4.2 0 0 0-2.3 2.5 4.3 4.3 0 0 0 .5 4.8 4.2 4.2 0 0 0 .4 2.8 4.3 4.3 0 0 0 3.7 2.1c.3 0 .6 0 .9-.1A4.2 4.2 0 0 0 13.5 20a4.3 4.3 0 0 0 4.1-2.9 4.2 4.2 0 0 0 2.3-2.5 4.3 4.3 0 0 0-.9-4z"
          stroke="#10A37F"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.2" fill="#10A37F" />
      </svg>
    );
  }

  // DeepSeek
  if (id.includes("deepseek")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#0284C7" fillOpacity="0.12" />
        <path
          d="M5.5 14.5c2-3.5 6-6.5 12-4.5-2.5 3.5-5 5-8 5-1.5 0-3-.2-4-.5z"
          fill="#0284C7"
        />
        <circle cx="8" cy="12" r="1.2" fill="#FFFFFF" />
        <path
          d="M17.5 10c1.5-1 2.5-.5 3 0-1 1.5-2.5 2-3 2"
          stroke="#0284C7"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Qwen (Alibaba)
  if (id.includes("qwen")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#7C3AED" fillOpacity="0.12" />
        <path
          d="M12 5L18 8.5V15.5L12 19L6 15.5V8.5L12 5Z"
          stroke="#7C3AED"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.5" fill="#7C3AED" />
      </svg>
    );
  }

  // GLM (Zhipu AI)
  if (id.includes("glm")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#2563EB" fillOpacity="0.12" />
        <path
          d="M7 8l5-3 5 3v8l-5 3-5-3V8z"
          stroke="#2563EB"
          strokeWidth="1.6"
        />
        <path d="M12 5v14" stroke="#2563EB" strokeWidth="1.4" />
      </svg>
    );
  }

  // Kimi (Moonshot AI)
  if (id.includes("kimi")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#4F46E5" fillOpacity="0.12" />
        <path
          d="M12 6a6 6 0 1 0 6 6 4.5 4.5 0 0 1-6-6z"
          fill="#4F46E5"
        />
        <circle cx="16.5" cy="8.5" r="1" fill="#4F46E5" />
      </svg>
    );
  }

  // MiniMax
  if (id.includes("minimax")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="6" fill="#EA580C" fillOpacity="0.12" />
        <path
          d="M7 14V10M10 16V8M14 17V7M17 13V11"
          stroke="#EA580C"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Wan (Video) or General AI
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#475569" fillOpacity="0.12" />
      <path
        d="M12 6v12M6 12h12"
        stroke="#475569"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
