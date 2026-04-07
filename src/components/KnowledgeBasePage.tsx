import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fileToBase64, getFileType, extractTextFromTxt, extractTextFromDocx, validateFile } from '@/utils/documentExtract';

interface KnowledgeDoc {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  expertise_tags: string[];
  detected_niche: string | null;
  summary: string | null;
  is_active: boolean;
  use_count: number;
  created_at: string;
}

interface KnowledgeBasePageProps {
  onNavigate: (page: string) => void;
}

export default function KnowledgeBasePage({ onNavigate }: KnowledgeBasePageProps) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadDocs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('user_knowledge_docs' as any)
      .select('id, filename, file_type, file_size_bytes, expertise_tags, detected_niche, summary, is_active, use_count, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDocs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const handleUpload = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const validation = validateFile(file);
    if (!validation.valid) { setUploadError(validation.error || ''); return; }

    if (docs.length >= 10) {
      setUploadError('You can store up to 10 documents. Remove one before uploading another.');
      return;
    }

    setUploading(true); setUploadError(''); setUploadSuccess('');
    setUploadStage('Reading your document...');

    try {
      const fileType = getFileType(file.name)!;
      let fileBase64 = '';
      let extractedText = '';

      if (fileType === 'pdf') {
        setUploadStage('Uploading PDF...');
        fileBase64 = await fileToBase64(file);
      } else if (fileType === 'docx') {
        setUploadStage('Extracting text from document...');
        extractedText = await extractTextFromDocx(file);
        fileBase64 = btoa(unescape(encodeURIComponent(extractedText)));
      } else {
        setUploadStage('Reading text file...');
        extractedText = await extractTextFromTxt(file);
        fileBase64 = btoa(unescape(encodeURIComponent(extractedText)));
      }

      setUploadStage('Analysing expertise and saving...');

      const { data, error } = await supabase.functions.invoke('save-knowledge-doc', {
        body: {
          userId: user.id,
          filename: file.name,
          fileType,
          fileBase64,
          extractedText: extractedText || null,
          fileSizeBytes: file.size,
        },
      });

      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Upload failed');

      setUploadSuccess(`"${file.name}" saved to your Knowledge Base.`);
      setTimeout(() => setUploadSuccess(''), 5000);
      await loadDocs();

    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    }

    setUploading(false); setUploadStage('');
  };

  const toggleDocActive = async (docId: string, currentState: boolean) => {
    await supabase
      .from('user_knowledge_docs' as any)
      .update({ is_active: !currentState, updated_at: new Date().toISOString() } as any)
      .eq('id', docId);
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, is_active: !currentState } : d));
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!confirm(`Remove "${filename}" from your Knowledge Base? This cannot be undone.`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setDeletingId(docId);
    await supabase.functions.invoke('delete-knowledge-doc', {
      body: { userId: user.id, docId },
    });
    setDocs(prev => prev.filter(d => d.id !== docId));
    setDeletingId(null);
  };

  return (
    <div style={{ padding: '32px 28px', maxWidth: 800, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>📚</span>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 900, fontSize: 26, color: '#0f172a', margin: 0 }}>
            Knowledge Base
          </h1>
          <span style={{
            background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 800, fontSize: 9, padding: '3px 8px', borderRadius: 50,
            letterSpacing: '0.06em',
          }}>
            New
          </span>
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
          Upload your documents, notes, and materials here. Product Navigator reads your knowledge base to generate ideas only you could build. Max 10 documents.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file && !uploading) handleUpload(file);
        }}
        style={{
          border: `2px dashed ${dragOver ? '#7c3aed' : '#e2e8f0'}`,
          borderRadius: 20, padding: uploading ? '28px' : '36px 24px',
          textAlign: 'center' as const, marginBottom: 20,
          background: dragOver ? 'rgba(124,58,237,0.04)' : 'rgba(255,255,255,0.6)',
          transition: 'all 0.2s',
          cursor: uploading ? 'default' : 'pointer',
        }}
        onClick={() => !uploading && document.getElementById('kb-file-input')?.click()}
      >
        <input
          id="kb-file-input" type="file" accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
          disabled={uploading}
        />

        {uploading ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 12, animation: 'float 2s ease-in-out infinite' }}>📚</div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#7c3aed', marginBottom: 8 }}>
              {uploadStage || 'Processing...'}
            </p>
            <div style={{ width: '60%', height: 4, background: '#f1f5f9', borderRadius: 50, margin: '0 auto', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 50, animation: 'shimmer 1.5s linear infinite', backgroundSize: '400px 100%' }} />
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>
              Upload a document to your Knowledge Base
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748b', marginBottom: 8 }}>
              Resume, course notes, training materials, research — anything that captures what you know
            </p>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#94a3b8', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 50, padding: '4px 12px' }}>
              PDF, DOCX, TXT · Max 5MB · {docs.length}/10 used
            </span>
          </>
        )}
      </div>

      {/* Success / Error messages */}
      {uploadSuccess && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#059669' }}>
          ✅ {uploadSuccess}
        </div>
      )}
      {uploadError && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#dc2626' }}>
          ❌ {uploadError}
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 40 }}>
          <div style={{ fontSize: 28, animation: 'spinSlow 2s linear infinite' }}>⏳</div>
        </div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <p style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Your Knowledge Base is empty</p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#94a3b8' }}>Upload your first document above to get started</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>
              {docs.length} Document{docs.length !== 1 ? 's' : ''} Stored
            </h3>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#94a3b8' }}>
              Active docs are used in "From My Expertise" tab
            </span>
          </div>

          {docs.map(doc => (
            <div key={doc.id} style={{
              background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
              borderRadius: 16, padding: 16, marginBottom: 12,
              border: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              opacity: doc.is_active ? 1 : 0.6,
              transition: 'opacity 0.2s',
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>
                  {doc.file_type === 'pdf' ? '📄' : doc.file_type === 'docx' ? '📝' : '📃'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' as const }}>
                    <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                      {doc.filename}
                    </span>
                    {doc.detected_niche && (
                      <span style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 50 }}>
                        {doc.detected_niche}
                      </span>
                    )}
                  </div>
                  {doc.expertise_tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 6 }}>
                      {doc.expertise_tags.slice(0, 5).map((tag: string) => (
                        <span key={tag} style={{ background: '#f1f5f9', color: '#64748b', fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 50 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#94a3b8' }}>
                    {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB · ` : ''}
                    Added {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {doc.use_count > 0 ? ` · Used ${doc.use_count} time${doc.use_count !== 1 ? 's' : ''}` : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {doc.summary && (
                    <button
                      onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                      style={{ background: '#f8fafc', border: '1px solid #f1f5f9', color: '#64748b', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                    >
                      {expandedId === doc.id ? '▲' : '▼'}
                    </button>
                  )}

                  {/* Active toggle */}
                  <div
                    onClick={() => toggleDocActive(doc.id, doc.is_active)}
                    title={doc.is_active ? 'Active — click to disable' : 'Inactive — click to enable'}
                    style={{
                      width: 40, height: 22, borderRadius: 50, cursor: 'pointer',
                      background: doc.is_active ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#e2e8f0',
                      position: 'relative' as const, transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: 'white',
                      position: 'absolute' as const, top: 3, left: doc.is_active ? 21 : 3,
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    disabled={deletingId === doc.id}
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#dc2626', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                  >
                    {deletingId === doc.id ? '...' : '🗑'}
                  </button>
                </div>
              </div>

              {/* Expanded summary */}
              {expandedId === doc.id && doc.summary && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 }}>
                    Expertise Summary
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 12 }}>
                    {doc.summary}
                  </p>
                  <button
                    onClick={() => onNavigate('product')}
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 12 }}
                  >
                    🧠 Generate Ideas from This Document →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div style={{
        background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)',
        borderRadius: 16, padding: 20, marginTop: 24,
        border: '1px solid rgba(255,255,255,0.9)',
      }}>
        <h4 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 14 }}>
          💡 How Your Knowledge Base Works
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {[
            { icon: '📤', text: 'Upload your documents once — resume, notes, course materials, anything that captures your expertise.' },
            { icon: '🧠', text: 'Toggle a document "Active" to include it in your Product Navigator context.' },
            { icon: '🎯', text: 'In Product Navigator → "From My Expertise" tab, your active documents generate ideas only you could build.' },
            { icon: '🔁', text: 'Your documents stay here permanently. Reuse them across sessions — no re-uploading needed.' },
          ].map(item => (
            <div key={item.icon} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
