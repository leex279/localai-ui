import React, { useEffect, useRef } from 'react';
import { ServiceDefinition, ServicesState } from '../types';

interface DependencyGraphProps {
  services: ServiceDefinition[];
  state: ServicesState;
}

export default function DependencyGraph({ services, state }: DependencyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Get only selected services
  const selectedServices = services.filter(service => state[service.id]?.selected);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Define the coordinates for each service
    const nodePositions: Record<string, { x: number; y: number }> = {};
    const radius = 40;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    if (selectedServices.length === 0) {
      // If no services are selected, display a message
      ctx.font = '16px Arial';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.fillText('Select services to visualize dependencies', centerX, centerY);
      return;
    }
    
    // Position nodes in a circle
    const angleStep = (2 * Math.PI) / selectedServices.length;
    const graphRadius = Math.min(canvas.width, canvas.height) / 2 - radius - 20;
    
    selectedServices.forEach((service, index) => {
      const angle = index * angleStep;
      const x = centerX + graphRadius * Math.cos(angle);
      const y = centerY + graphRadius * Math.sin(angle);
      nodePositions[service.id] = { x, y };
    });
    
    // Draw the edges (dependency connections) first so they're behind the nodes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    
    selectedServices.forEach(service => {
      const source = nodePositions[service.id];
      if (!source) return;
      
      // Get direct dependencies that are also selected
      const dependencies = service.dependencies.filter(depId => 
        selectedServices.some(s => s.id === depId)
      );
      
      dependencies.forEach(depId => {
        const target = nodePositions[depId];
        if (!target) return;
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        
        // Draw arrow tip
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const arrowLength = 10;
        const arrowX = target.x - radius * Math.cos(angle);
        const arrowY = target.y - radius * Math.sin(angle);
        
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
          arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
          arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = '#999';
        ctx.fill();
      });
    });
    
    // Draw the nodes
    selectedServices.forEach(service => {
      const { x, y } = nodePositions[service.id];
      
      // Background
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      
      // Determine color based on service category
      let fillColor = '#f3f4f6';
      switch (service.category) {
        case 'ai':
          fillColor = '#f5f3ff';
          break;
        case 'database':
          fillColor = '#e1f5fe';
          break;
        case 'infrastructure':
          fillColor = '#e0f2f1';
          break;
        case 'utility':
          fillColor = '#fff8e1';
          break;
      }
      
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      // Border
      ctx.strokeStyle = state[service.id]?.required ? '#4338ca' : '#e5e7eb';
      ctx.lineWidth = state[service.id]?.required ? 3 : 1;
      ctx.stroke();
      
      // Text
      ctx.font = '12px Arial';
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Wrap text if needed
      const words = service.name.split(' ');
      let line = '';
      let lineHeight = 14;
      let y0 = y - (words.length > 1 ? lineHeight / 2 : 0);
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > radius * 1.5 && i > 0) {
          ctx.fillText(line, x, y0);
          line = words[i] + ' ';
          y0 += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y0);
    });
    
  }, [services, state, selectedServices]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Dependency Visualization</h2>
      <canvas
        ref={canvasRef}
        className="w-full"
        width={600}
        height={400}
      />
    </div>
  );
}