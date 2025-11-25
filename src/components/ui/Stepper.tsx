"use client";

import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

interface Step {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export default function Stepper({ steps, currentStep, className = '' }: StepperProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = step.completed;
          const isUpcoming = currentStep < step.id && !step.completed;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div className="relative">
                  <motion.div
                    className={`
                      flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                      ${isCompleted 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-500 shadow-lg shadow-emerald-200' 
                        : isActive 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-500 shadow-lg shadow-blue-200' 
                          : 'bg-white border-slate-300'
                      }
                    `}
                    initial={false}
                    animate={{ 
                      scale: isActive ? 1.1 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    ) : (
                      <span className={`text-sm font-bold ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}>
                        {step.id}
                      </span>
                    )}
                  </motion.div>
                  
                  {/* Active Pulse Effect */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-blue-400 opacity-75"
                      animate={{ scale: [1, 1.5, 1.5], opacity: [0.75, 0, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-3 text-center max-w-[120px]">
                  <p className={`text-sm font-medium transition-colors ${
                    isCompleted 
                      ? 'text-emerald-600' 
                      : isActive 
                        ? 'text-blue-600' 
                        : 'text-slate-500'
                  }`}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-slate-400 mt-1">{step.description}</p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 relative">
                  <div className={`absolute inset-0 transition-colors duration-300 ${
                    isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                  }`} />
                  {isCompleted && (
                    <motion.div
                      className="absolute inset-0 bg-emerald-400"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

