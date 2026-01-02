
import React, { useState } from 'react';
import { Product, Invoice } from '../types';
import { SparklesIcon } from './icons';
import { GoogleGenAI } from '@google/genai';

interface AIInsightsProps {
    products: Product[];
    invoices: Invoice[];
}

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n').map((line, index) => {
        line = line.trim();
        if (line.startsWith('### ')) {
            return <h3 key={index} className="text-lg font-semibold text-slate-800 mt-4 mb-2">{line.substring(4)}</h3>;
        }
        if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-bold text-slate-900 mt-6 mb-3">{line.substring(3)}</h2>;
        }
        if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-extrabold text-slate-900 mt-8 mb-4">{line.substring(2)}</h1>;
        }
        if (line.startsWith('* ') || line.startsWith('- ')) {
            return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>;
        }
        if (line === '') {
            return null;
        }
        const parts = line.split('**');
        const renderedParts = parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-700">{part}</strong> : <span key={i}>{part}</span>
        );
        return <p key={index} className="text-slate-600 mb-2 leading-relaxed">{renderedParts}</p>;
    });

    return <div className="prose prose-sm max-w-none">{lines}</div>;
};


const AIInsights: React.FC<AIInsightsProps> = ({ products, invoices }) => {
    const [insights, setInsights] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateInsights = async () => {
        setIsLoading(true);
        setError(null);
        setInsights(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                You are a business consultant for an inventory and sales tracking app. 
                Analyze the following data and provide actionable business insights, 
                performance summaries, and stock recommendations.
                
                Products: ${JSON.stringify(products.slice(0, 50))}
                Invoices: ${JSON.stringify(invoices.slice(0, 20))}
                
                Format your response in professional Markdown with sections for:
                1. Executive Summary
                2. Sales Performance
                3. Inventory Health
                4. Financial Health
                5. Recommendations
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            if (!response.text) {
                throw new Error('AI failed to generate insights.');
            }

            setInsights(response.text);
        } catch (err: any) {
            setError(err.message || "Failed to generate AI insights.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <SparklesIcon className="w-7 h-7 text-primary" />
                    <h2 className="text-xl font-bold text-slate-800">AI Insights</h2>
                </div>
                <button
                    onClick={generateInsights}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-xl shadow-lg shadow-indigo-100 hover:bg-primary-hover focus:outline-none disabled:opacity-50 transition-all"
                >
                    {isLoading ? 'Thinking...' : (insights ? 'Regenerate' : 'Generate')}
                </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
                {isLoading && <p className="text-slate-400 text-center animate-pulse text-sm">Consulting with AI expert...</p>}
                {error && <p className="text-red-600 text-center p-4 bg-red-50 rounded-xl text-xs">{error}</p>}
                {insights && (
                    <div className="space-y-4">
                        <SimpleMarkdown text={insights} />
                    </div>
                )}
                {!isLoading && !insights && !error && (
                     <p className="text-slate-400 text-center py-4 text-sm font-medium">Click "Generate" to see stock trends and sales advice.</p>
                )}
            </div>
        </div>
    );
};

export default AIInsights;
