"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import ChatInput from './components/ChatInput';
import DynamicViewRenderer from './components/DynamicViewRenderer';
import apiService, { DynamicView } from './services/api';

export default function Home() {
  const [activeView, setActiveView] = useState<string | null>(null);
  const [hasMessages, setHasMessages] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isInitialView, setIsInitialView] = useState(true);
  const [pendingDynamicView, setPendingDynamicView] = useState<DynamicView | null>(null);
  const [closedDynamicView, setClosedDynamicView] = useState<DynamicView | null>(null);
  const [fullscreenDynamicView, setFullscreenDynamicView] = useState<DynamicView | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isChatExplicitlyClosed, setIsChatExplicitlyClosed] = useState(false);
  const [activeDynamicView, setActiveDynamicView] = useState<DynamicView | null>(null);

  // On initial load, always show the initial landing page (isInitialView = true), regardless of chat history
  useEffect(() => {
    setIsInitialView(true);
    setIsChatVisible(true);
    setActiveView(null);
    setFullscreenDynamicView(null);
    
    // Clear the current chat ID on page refresh to ensure new messages start a new chat
    apiService.setCurrentChat('');
    
    // Force a refresh of the chat state
    const chatChangeEvent = new CustomEvent('chatChanged', {
      detail: { chatId: '', messages: [] }
    });
    window.dispatchEvent(chatChangeEvent);
  }, []);
 
  // Listen for chat selection from history
  useEffect(() => {
    const handleChatChange = (e: CustomEvent) => {
      // If chat ID exists, ensure the chat view is shown regardless of messages
      if (e.detail.chatId) {
        setActiveView(null);
        setIsChatVisible(true);
        
        // If there are no messages, this is a new chat, so show initial view
        if (!e.detail.messages || e.detail.messages.length === 0) {
          setIsInitialView(true);
        } else {
          setIsInitialView(false);
        }
        
        // Reset the explicit close state when a chat is selected
        setIsChatExplicitlyClosed(false);
        return;
      }

      // If messages are empty and no chatId, reset to initial view
      if (!e.detail.messages || e.detail.messages.length === 0) {
        setActiveView(null);
        setIsChatVisible(true);
        setIsInitialView(true);
        return;
      }
      
      // Make sure the chat becomes visible when a chat is selected from history
      if (e.detail.messages && e.detail.messages.length > 0) {
        // Clear any active view when a chat is selected
        setActiveView(null);
        setIsChatVisible(true);
        setIsInitialView(false);
        // Reset the explicit close state when showing chat
        setIsChatExplicitlyClosed(false);
      }
    };
   
    // Add event listener for chat changed events
    window.addEventListener('chatChanged', handleChatChange as EventListener);
   
    return () => {
      window.removeEventListener('chatChanged', handleChatChange as EventListener);
    };
  }, []);

  // Function to handle sending a message in the chat
  const handleMessageSent = (isClosing?: boolean, dynamicView?: DynamicView, isClosed?: boolean) => {
    // Check for existing messages
    const hasExistingMessages = apiService.getCurrentChatMessages().length > 0;
    setHasMessages(hasExistingMessages);
   
    if (isClosing) {
      if (dynamicView) {
        if (isClosed) {
          setClosedDynamicView(dynamicView);
          setPendingDynamicView(null);
          return;
        }
        setActiveDynamicView(dynamicView);
        setActiveView('dynamic-view');
        setIsChatVisible(false);
        return;
      }
      // Regular closing behavior
      // If no tab was selected (activeView is null) and we're not in initial view,
      // we should return to the initial view
      if (!activeView && !isInitialView) {
        setIsInitialView(true);
        setIsChatVisible(true); // Keep chat visible but in initial view
        setFullscreenDynamicView(null);
        // Mark chat as explicitly closed
        setIsChatExplicitlyClosed(true);
        // Clear current chat ID to ensure new messages start a new chat
        apiService.setCurrentChat('');
      }
      // If a tab was selected previously, make it visible again
      else if (activeView) {
        setIsChatVisible(false);
        // Clear fullscreen view when closing
        if (activeView === 'dynamic-view') {
          setFullscreenDynamicView(null);
        }
        // Mark chat as explicitly closed
        setIsChatExplicitlyClosed(true);
        // Clear current chat ID to ensure new messages start a new chat
        apiService.setCurrentChat('');
      }
      // Otherwise if we're already in initial view, just hide the chat
      else {
        setIsChatVisible(false);
        setFullscreenDynamicView(null);
        // Mark chat as explicitly closed
        setIsChatExplicitlyClosed(true);
        // Clear current chat ID to ensure new messages start a new chat
        apiService.setCurrentChat('');
      }
     
      // Don't clear closed dynamic view when closing chat - we want to keep it
      // so the "Show response" button can be clicked later
      setPendingDynamicView(null);
    } else {
      // Normal message sending behavior - not closing
     
      // When we have existing messages, switch to chat view mode
      if (hasExistingMessages) {
        setIsInitialView(false);
      }
     
      setIsChatVisible(true); // Always show chat when a message is sent
     
      // Reset the explicit close state when sending a message
      setIsChatExplicitlyClosed(false);
     
      // Store the dynamic view if provided
      if (dynamicView) {
        if (isClosed) {
          setClosedDynamicView(dynamicView);
          setPendingDynamicView(null);
          setActiveDynamicView(null);
        } else {
          setPendingDynamicView(dynamicView);
          setClosedDynamicView(null);
          setActiveDynamicView(null);
        }
      }
     
      // If a view is active, hide it
      if (activeView) {
        setActiveView(null);
      }
    }
  };

  // Handle navigation clicks from the sidebar
  const handleNavClick = (view: string) => {
    // Store previous active view
    const prevActiveView = activeView;
   
    setActiveView(view);
   
    // If this is the first tab click, mark as no longer in initial view
    if (isInitialView) {
      setIsInitialView(false);
    }
   
    // Hide chat when navigating to a view, but only if
    // we're currently showing the chat or changing views
    if (isChatVisible || prevActiveView !== view) {
      setIsChatVisible(false);
      // Don't clear closedDynamicView, as we want to preserve it
      // when the user returns to the chat
      // Only clear pending dynamic view
      setPendingDynamicView(null);
      // Do NOT set isChatExplicitlyClosed here; preserve chat state when switching tabs
    }
  };

  // Handle closing a view
  const handleCloseView = () => {
    setActiveView(null);
    setActiveDynamicView(null);
   
    // If we have a chat history, show the chat in non-initial view
    const currentMessages = apiService.getCurrentChatMessages();
    if (currentMessages.length > 0) {
      setIsInitialView(false);
      setIsChatVisible(true);
    }
    // If no chat history, show initial view
    else {
      setIsInitialView(true);
      setIsChatVisible(true);
    }
  };

  // Handle sidebar expansion state change
  const handleSidebarToggle = (expanded: boolean) => {
    setIsSidebarExpanded(expanded);
    // Force a re-render of the main content area
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300); // Match the duration of the sidebar transition
  };

  // Check if we're on a mobile device
  const [isMobile, setIsMobile] = useState(false);
 
  // Handle window resize to detect mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is typical md breakpoint
    };
   
    // Initial check
    checkIfMobile();
   
    // Listen for window resize
    window.addEventListener('resize', checkIfMobile);
   
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Set up global keyboard handler for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeView) {
        handleCloseView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeView]);

  return (
    <main className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar onNavClick={handleNavClick} activeView={activeView} onToggle={handleSidebarToggle} />

      {/* Main Content Area - adjust margin based on sidebar state */}
      <div className={`flex-1 h-screen overflow-hidden flex flex-col relative transition-all duration-300
        ${isMobile
          ? isSidebarExpanded ? 'ml-0' : 'ml-0'
          : isSidebarExpanded ? 'ml-62' : 'ml-20'}`}
        style={{ willChange: 'transform' }}
      >
        {/* Render active view */}
        {activeView && (
          <DynamicViewRenderer
            viewId={activeView}
            onClose={handleCloseView}
            dynamicViewContent={activeView === 'dynamic-view' ? activeDynamicView : undefined}
          />
        )}
       
        {/* Render chat if visible */}
        {isChatVisible && <Chat
          key={activeView || 'default'}
          isVisible={true}
          onMessageSent={handleMessageSent}
          isInitialView={isInitialView}
          activeView={activeView}
          pendingDynamicView={pendingDynamicView}
          closedDynamicView={closedDynamicView}
        />}
       
        {/* If nothing is visible, show a fallback */}
        {!activeView && !isChatVisible && !isInitialView && (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => {
                // Create a new chat when entering chat from closed state
                const newChatId = apiService.createNewChat();
               
                // Notify components about the new chat
                const chatChangeEvent = new CustomEvent('chatChanged', {
                  detail: { chatId: newChatId, messages: [] }
                });
                window.dispatchEvent(chatChangeEvent);
               
                // Show chat view
                setIsChatVisible(true);
                setIsInitialView(true); // Show initial welcome view for the new chat
               
                // Reset the explicit close state when starting a new chat
                setIsChatExplicitlyClosed(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Start Chatting
            </button>
          </div>
        )}

        {/* Fixed chat input box at the bottom (visible on all pages except initial view) */}
        {!isInitialView && !isChatVisible && activeView && (
          <div className={`fixed bottom-0 right-0 bg-white p-4 shadow-md z-10 transition-all duration-300
            ${isMobile
              ? 'left-0'
              : isSidebarExpanded ? 'left-0' : 'left-0'}`}
          >
            <ChatInput
              isChatExplicitlyClosed={isChatExplicitlyClosed}
              onMessageSent={(isClosing, dynamicView) => {
              // Enhanced callback to guarantee the chat becomes visible
              if (!isClosing) {
                setIsChatVisible(true);
                setActiveView(null);
               
                // Store dynamic view if provided
                if (dynamicView) {
                  setPendingDynamicView(dynamicView);
                  setClosedDynamicView(null);
                }
              }
              handleMessageSent(isClosing, dynamicView);
            }} />
          </div>
        )}
      </div>
    </main>
  );
}









