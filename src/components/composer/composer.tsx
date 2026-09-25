"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { Markdown } from "tiptap-markdown";
import { Bold, Code, Heading2, ImageIcon, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mentionSuggestion } from "@/components/composer/mention-suggestion";
import { previewMarkdown } from "@/app/community/actions";
import { resizeImage } from "@/lib/images/resize";
import { cn } from "@/lib/utils";

type Props = {
  name?: string;
  initialMarkdown?: string;
  placeholder?: string;
  /* Key for draft autosave in localStorage. Omit to disable. */
  draftKey?: string;
  minHeight?: number;
  autoFocus?: boolean;
  onChange?: (markdown: string) => void;
  /* Set by the parent to insert a quote from a post. */
  insertRef?: React.MutableRefObject<((markdown: string) => void) | null>;
  disabled?: boolean;
};

/*
  Tiptap composer that stores Markdown. Write and Preview tabs, a small
  toolbar, image paste and drop (resized in the browser, uploaded to Supabase
  Storage), @mention autocomplete and draft autosave.
*/
export function Composer({
  name = "body_md",
  initialMarkdown = "",
  placeholder = "Write your post. Markdown works.",
  draftKey,
  minHeight = 200,
  autoFocus,
  onChange,
  insertRef,
  disabled,
}: Props) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewPending, startPreview] = useTransition();
  const uploadingRef = useRef(0);
  const [uploading, setUploading] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: {}, link: false }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        renderText: ({ node }) => `@${node.attrs.id}`,
        suggestion: mentionSuggestion,
      }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    content: initialMarkdown,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none px-3 py-2",
        style: `min-height:${minHeight}px`,
      },
      handlePaste: (_view, event) => handleFiles(event.clipboardData?.files),
      handleDrop: (_view, event) => handleFiles(event.dataTransfer?.files),
    },
    onUpdate: ({ editor: e }) => {
      const md = getMarkdown(e);
      setMarkdown(md);
      onChange?.(md);
    },
  });

  function getMarkdown(e: Editor): string {
    const storage = e.storage as unknown as { markdown?: { getMarkdown: () => string } };
    return storage.markdown?.getMarkdown() ?? "";
  }

  function handleFiles(files: FileList | undefined | null): boolean {
    if (!files || files.length === 0) return false;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return false;
    images.forEach((file) => void uploadImage(file));
    return true;
  }

  async function uploadImage(file: File) {
    if (!editor) return;
    uploadingRef.current += 1;
    setUploading(uploadingRef.current);
    try {
      const resized = await resizeImage(file, 1600);
      const body = new FormData();
      body.append("file", resized, file.name.replace(/\.[^.]+$/, "") + ".webp");
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "Upload failed");
      }
      const { url } = (await res.json()) as { url: string };
      editor.chain().focus().setImage({ src: url, alt: "" }).run();
      toast("Image added. Check it for buyer names, addresses and order numbers before you post.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      uploadingRef.current -= 1;
      setUploading(uploadingRef.current);
    }
  }

  /* Draft autosave. Restored once on mount if the field is otherwise empty. */
  useEffect(() => {
    if (!draftKey || !editor) return;
    try {
      const saved = localStorage.getItem(`draft:${draftKey}`);
      if (saved && !initialMarkdown) {
        // emitUpdate routes through onUpdate, which syncs the hidden field.
        editor.commands.setContent(saved, { emitUpdate: true });
      }
    } catch {
      // Storage unavailable.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, editor]);

  useEffect(() => {
    if (!draftKey) return;
    const id = window.setTimeout(() => {
      try {
        if (markdown.trim()) localStorage.setItem(`draft:${draftKey}`, markdown);
        else localStorage.removeItem(`draft:${draftKey}`);
      } catch {
        // Storage unavailable.
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [markdown, draftKey]);

  useEffect(() => {
    if (!insertRef) return;
    insertRef.current = (md: string) => {
      if (!editor) return;
      const current = getMarkdown(editor);
      const next = current.trim() ? `${current}\n\n${md}\n\n` : `${md}\n\n`;
      editor.commands.setContent(next);
      editor.commands.focus("end");
      setMarkdown(next);
      onChange?.(next);
      setTab("write");
    };
    return () => {
      insertRef.current = null;
    };
  }, [insertRef, editor, onChange]);

  function showPreview() {
    setTab("preview");
    startPreview(async () => {
      setPreviewHtml(markdown.trim() ? await previewMarkdown(markdown) : "");
    });
  }

  function addLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function pickImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => handleFiles(input.files);
    input.click();
  }

  return (
    <div className="rounded-lg border bg-background">
      <input type="hidden" name={name} value={markdown} />
      <Tabs value={tab} onValueChange={(v) => (v === "preview" ? showPreview() : setTab("write"))}>
        <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          {editor && tab === "write" ? (
            <div className="ml-auto flex items-center gap-0.5" role="toolbar" aria-label="Formatting">
              <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold />
              </ToolbarButton>
              <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic />
              </ToolbarButton>
              <ToolbarButton label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <Heading2 />
              </ToolbarButton>
              <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <Quote />
              </ToolbarButton>
              <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List />
              </ToolbarButton>
              <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered />
              </ToolbarButton>
              <ToolbarButton label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
                <Code />
              </ToolbarButton>
              <ToolbarButton label="Link" active={editor.isActive("link")} onClick={addLink}>
                <Link2 />
              </ToolbarButton>
              <ToolbarButton label="Image" onClick={pickImage}>
                <ImageIcon />
              </ToolbarButton>
            </div>
          ) : null}
        </div>
        <TabsContent value="write" className="mt-0">
          <EditorContent editor={editor} />
          <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-muted-foreground">
            <span>{uploading > 0 ? `Uploading ${uploading} image${uploading === 1 ? "" : "s"}` : "Screenshots welcome: paste with Ctrl+V or drop them here. Blur buyer names and order numbers. Type @ to mention someone."}</span>
            <span>{markdown.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>
        </TabsContent>
        <TabsContent value="preview" className="mt-0">
          <div className="min-h-[200px] px-3 py-2">
            {previewPending ? (
              <p className="text-sm text-muted-foreground">Rendering</p>
            ) : previewHtml ? (
              <div className="post-body prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToolbarButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(active && "bg-secondary")}
    >
      {children}
    </Button>
  );
}
