"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, ArrowLeft } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../components/ToastProvider";
import {
  Button,
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  Input,
  Label,
} from "../../components/ui";
import { ErrorMessage, FieldError } from "../../components/AccountPanels";
const schema = z.object({
  type: z.enum(["Need help", "Offer help", "Request item", "Offer service"]),
  title: z
    .string()
    .trim()
    .min(6, "Use a descriptive title of at least 6 characters")
    .max(200)
    .refine(
      (s) => s.split(/\s+/).length >= 2 && /\p{L}/u.test(s),
      "Describe your post in at least two words",
    ),
  description: z
    .string()
    .trim()
    .min(20, "Include what you need, where and when")
    .max(10000)
    .refine((s) => s.split(/\s+/).length >= 4, "Use at least four words"),
  locality: z.string().trim().min(2, "Enter your area").max(100),
  category: z.enum([
    "Help Requests",
    "Donations & Giveaways",
    "Skill Offers",
    "Community Alerts",
  ]),
  priority: z.enum(["Low", "Medium", "High"]),
  deadline: z.string(),
});
export default function CreatePostPage() {
  const auth = useAuth(),
    router = useRouter(),
    toast = useToast();
  const [error, setError] = useState(""),
    [file, setFile] = useState(null),
    [community, setCommunity] = useState(null),
    [billing, setBilling] = useState(null);
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "Need help",
      title: "",
      description: "",
      locality: auth?.user?.locality || "",
      category: "Help Requests",
      priority: "Medium",
      deadline: "",
    },
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCommunity(params.get("community"));
    const presetType = params.get("type");
    if (["Need help", "Offer help", "Request item", "Offer service"].includes(presetType)) {
      setValue("type", presetType);
      if (presetType === "Offer help" || presetType === "Offer service") setValue("category", "Skill Offers");
    }
    api("/billing", { auth: true })
      .then(setBilling)
      .catch((e) => setError(e.message));
  }, []);
  async function submit(values) {
    setError("");
    try {
      let image_url = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024)
          throw Error("Photo must be smaller than 5 MB.");
        const form = new FormData();
        form.append("file", file);
        const data = await api("/posts/upload-image", {
          method: "POST",
          auth: true,
          body: form,
        });
        image_url = data.image_url;
      }
      const post = await api("/posts", {
        method: "POST",
        auth: true,
        body: {
          ...values,
          deadline: values.deadline
            ? new Date(values.deadline).toISOString()
            : null,
          image_url,
          community_id: community ? Number(community) : null,
        },
      });
      toast(
        post.spam_flag
          ? "Post saved for moderation review."
          : "Your notice is on the board.",
      );
      router.push(`/post/${post.id}`);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Button asChild variant="ghost">
        <Link
          href={
            community ? `/noticeboard?community=${community}` : "/noticeboard"
          }
        >
          <ArrowLeft className="size-4" />
          Back to the board
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">
            Create a neighbourhood notice
          </h1>
          <CardDescription>
            {community
              ? "Share with members of your private society board."
              : "Ask clearly, keep it local, and leave money out of the exchange."}{" "}
            Hindi and Gujarati are welcome.
          </CardDescription>
          {billing && (
            <p className="text-xs text-ink-muted">
              {billing.used} posts used this month
              {billing.limit == null
                ? " · Unlimited allowance"
                : ` · ${billing.limit} allowed`}{" "}
              ·{" "}
              <Link
                className="text-brand underline"
                href="/settings?tab=billing"
              >
                Manage plan
              </Link>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(submit)} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-type">I want to</Label>
                <select
                  id="create-type"
                  className="filter-control"
                  {...register("type")}
                >
                  {[
                    "Need help",
                    "Offer help",
                    "Request item",
                    "Offer service",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="create-category">Category</Label>
                <select
                  id="create-category"
                  className="filter-control"
                  {...register("category")}
                >
                  {[
                    "Help Requests",
                    "Donations & Giveaways",
                    "Skill Offers",
                    "Community Alerts",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {[
              ["title", "Title", "Can someone lend a folding ladder?"],
              ["locality", "Area / society", "Gota, Ahmedabad · 382481"],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <Label htmlFor={`create-${key}`}>{label}</Label>
                <Input
                  id={`create-${key}`}
                  placeholder={placeholder}
                  {...register(key)}
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `error-${key}` : undefined}
                />
                <FieldError id={`error-${key}`} error={errors[key]} />
              </div>
            ))}
            <div>
              <Label htmlFor="create-description">Details</Label>
              <textarea
                id="create-description"
                rows={5}
                className="filter-control"
                placeholder="Tell neighbours what you need or can share, when you’re available, and a safe place to meet."
                {...register("description")}
                aria-invalid={!!errors.description}
                aria-describedby={
                  errors.description ? "error-description" : undefined
                }
              />
              <FieldError id="error-description" error={errors.description} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-priority">Urgency</Label>
                <select
                  id="create-priority"
                  className="filter-control"
                  {...register("priority")}
                >
                  {["Low", "Medium", "High"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="create-deadline">Needed by (optional)</Label>
                <Input
                  id="create-deadline"
                  type="datetime-local"
                  {...register("deadline")}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="create-photo" className="flex gap-2 items-center">
                <ImagePlus className="size-4" />
                Photo (optional)
              </Label>
              <Input
                id="create-photo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-ink-muted mt-2">
                Up to 5 MB. Avoid faces, documents, and personal details without
                permission.
              </p>
            </div>
            <p className="text-sm text-ink-muted">
              Publishing shares your notice and profile details with visitors,
              or members of the selected society board. Photos must be yours or
              licensed for this use; get permission for identifiable people.
              Public-notice photos are public; society-notice photos are limited
              to members and authorised reviewers. Do not post a full home
              address or identity documents.{" "}
              <Link className="underline" href="/privacy">
                Read the privacy notice
              </Link>
              .
            </p>
            <ErrorMessage message={error} />
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={
                billing &&
                billing.limit != null &&
                billing.used >= billing.limit
              }
            >
              Publish notice
            </Button>
            {billing &&
              billing.limit != null &&
              billing.used >= billing.limit && (
                <p className="text-sm text-warning">
                  Your monthly allowance is used.{" "}
                  <Link href="/pricing" className="underline">
                    Compare plans
                  </Link>{" "}
                  or wait for next month.
                </p>
              )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
