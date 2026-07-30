'use client';

import React, { useState } from 'react';
import { Sparkles, Send, Wand2 } from 'lucide-react';

interface CampaignBuilderProps {
  onCampaignCreate?: (campaignId: string) => void;
}

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({ onCampaignCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'email' as const,
    subject: '',
    body: '',
    ctaText: 'View More',
    ctaUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aiReady, setAiReady] = useState(true);
  const [aiMessage, setAiMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateAIContent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/marketing/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a high-converting marketing message for a print shop in Arabic or French. Focus on: ${formData.name || 'premium print campaign'}, ${formData.description || 'customer loyalty and rapid delivery'}`,
        }),
      });
      const data = await response.json();
      if (data.insight) {
        const aiText = data.insight.replace(/\n+/g, '\n');
        setFormData((prev) => ({ ...prev, body: aiText, subject: prev.subject || 'Offre exclusive pour votre prochain projet' }));
        setAiMessage(aiText);
        setAiReady(true);
      }
    } catch (error) {
      console.error('AI generation failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          status: 'draft',
          template: {
            templateId: `tmpl_${Date.now()}`,
            templateName: formData.name,
            subject: formData.subject,
            body: formData.body,
            cta: {
              text: formData.ctaText,
              url: formData.ctaUrl,
              style: 'primary',
              trackingId: `track_${Date.now()}`,
            },
            variables: {},
          },
          segmentation: {
            segmentType: 'all',
            filters: [],
            excludeSegments: [],
            estimatedReach: 1000,
          },
          schedule: {
            startDate: new Date(),
            sendTime: '09:00',
            timezone: 'UTC',
            frequency: 'once',
          },
          content: {
            title: formData.name,
            contentBlocks: [
              {
                id: 'block_1',
                type: 'text',
                content: formData.body,
              },
            ],
          },
          createdBy: 'admin',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        onCampaignCreate?.(data.campaignId);
        setFormData({
          name: '',
          description: '',
          type: 'email',
          subject: '',
          body: '',
          ctaText: 'View More',
          ctaUrl: '',
        });
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-xl dark:bg-slate-900/80">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">AI Campaign Studio</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Créer une campagne ultra-ciblée</h2>
        </div>
        <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
          <Sparkles size={18} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="mb-3 flex items-center gap-2">
            <Wand2 size={16} className="text-blue-600" />
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">Génération IA assistée</p>
          </div>
          <button type="button" onClick={generateAIContent} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-700">
            {loading ? 'Génération...' : 'Générer un message avec l’IA'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">اسم الحملة</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="مثال: عرض العطلة الصيفية"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">الوصف</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="وصف الحملة..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">نوع الحملة</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="email">البريد الإلكتروني</option>
              <option value="sms">رسالة نصية</option>
              <option value="push">إشعار فوري</option>
              <option value="social">وسائل التواصل</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الموضوع</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="موضوع الرسالة"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">محتوى الحملة</label>
          <textarea
            name="body"
            value={formData.body}
            onChange={handleInputChange}
            placeholder="أدخل محتوى الحملة هنا..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">نص الزر</label>
            <input
              type="text"
              name="ctaText"
              value={formData.ctaText}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">رابط الزر</label>
            <input
              type="url"
              name="ctaUrl"
              value={formData.ctaUrl}
              onChange={handleInputChange}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {aiMessage && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700">✨ {aiMessage.slice(0, 180)}{aiMessage.length > 180 ? '...' : ''}</div>}
        {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">✅ Campagne créée avec succès et prête à être diffusée.</div>}

        <button
          onClick={handleCreateCampaign}
          disabled={loading || !formData.name}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-black text-white transition hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'جاري الإنشاء...' : <> <Send size={18} /> Lancer la campagne</>}
        </button>
      </div>
    </div>
  );
};
