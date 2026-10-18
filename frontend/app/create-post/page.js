"use client";
import { useEffect, useState } from "react";
import { useLanguage, Text } from "../../lib/i18n";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field, Textarea, Select } from "../../components/Fields";
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
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "../../components/ui";
import { ErrorMessage, FieldError } from "../../components/FormFeedback";
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
    .max(
      9800,
      "Leave space for the optional landmark (9,800 characters maximum)",
    )
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
  const { t } = useLanguage();
  const auth = useAuth(),
    router = useRouter(),
    toast = useToast();
  const [preview, setPreview] = useState(null),
    [landmark, setLandmark] = useState(""),
    [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(""),
    [file, setFile] = useState(null),
    [community, setCommunity] = useState(null),
    [billing, setBilling] = useState(null);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
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
    if (
      ["Need help", "Offer help", "Request item", "Offer service"].includes(
        presetType,
      )
    ) {
      setValue("type", presetType);
      if (presetType === "Offer help" || presetType === "Offer service")
        setValue("category", "Skill Offers");
    }
    api("/billing", { auth: true })
      .then(setBilling)
      .catch((e) => setError(e.message));
  }, []);
  async function submit(values) {
    setError("");
    setPublishing(true);
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
          description: landmark.trim()
            ? `${values.description}\n\nNearby public landmark: ${landmark.trim()}`
            : values.description,
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
    } finally {
      setPublishing(false);
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
      <ol aria-label="Notice publishing steps" className="compose-steps">
        <li aria-current="step">
          <span>1</span>Write your notice
        </li>
        <li>
          <span>2</span>Preview
        </li>
        <li>
          <span>3</span>Publish
        </li>
      </ol>
      <Card>
        <CardHeader>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            <Text>Create a neighbourhood notice</Text>
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
          <form
            onSubmit={handleSubmit((values) => {
              setError("");
              setPreview(values);
            })}
            aria-busy={publishing}
            className="space-y-5"
          >
            <h2 className="compose-section-title">1. What are you sharing?</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-type">I want to</Label>
                <Select
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
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="create-category">Category</Label>
                <Select
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
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </Select>
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
              <Textarea
                id="create-description"
                rows={5}
                maxLength={9800}
                aria-describedby="description-help error-description"
                className="filter-control"
                placeholder="Tell neighbours what you need or can share, when you’re available, and a safe place to meet."
                {...register("description")}
                aria-invalid={!!errors.description}
              />
              <p id="description-help" className="text-sm text-ink-muted mt-2">
                {watch("description").length.toLocaleString("en-IN")} / 9,800
                characters. Say what you need, where and when.
              </p>
              <FieldError id="error-description" error={errors.description} />
            </div>
            <div className="border-t border-line pt-5 space-y-4">
              <h2 className="compose-section-title">2. Where and when?</h2>
              <Field
                id="create-landmark"
                label="Landmark (optional)"
                value={landmark}
                maxLength={80}
                onChange={(e) => setLandmark(e.target.value)}
                hint="e.g. Near Shiv Mandir, Gota. Use a public landmark, never a flat number or full home address. It will appear in your notice."
              />
              <p className="text-sm text-ink-muted">
                Your phone is optional and stays in your account.{" "}
                <Link className="underline" href="/settings">
                  Manage your +91 contact number and sharing choices
                </Link>
                .
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-priority">Urgency</Label>
                <Select
                  id="create-priority"
                  className="filter-control"
                  {...register("priority")}
                >
                  {["Low", "Medium", "High"].map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </Select>
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
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  if (
                    chosen &&
                    (chosen.size > 5 * 1024 * 1024 ||
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        chosen.type,
                      ))
                  ) {
                    setFile(null);
                    e.target.value = "";
                    setError(
                      "Choose a PNG, JPEG or WebP photo smaller than 5 MB.",
                    );
                  } else {
                    setFile(chosen || null);
                    setError("");
                  }
                }}
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
              Preview notice
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
          <Sheet
            open={!!preview}
            onOpenChange={(open) => {
              if (!open && !publishing) setPreview(null);
            }}
          >
            <SheetContent
              onInteractOutside={(event) => {
                if (publishing) event.preventDefault();
              }}
            >
              <SheetTitle>
                <Text>Preview your notice</Text>
              </SheetTitle>
              <SheetDescription>
                Check the public details before publishing. You can go back and
                edit.
              </SheetDescription>
              {preview && (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-brand">
                    {t(preview.type)} · {t(preview.category)}
                  </p>
                  <h2 className="text-2xl font-semibold">{preview.title}</h2>
                  <p className="whitespace-pre-wrap break-anywhere">
                    {preview.description}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {preview.locality}
                    {landmark.trim() ? ` · ${landmark.trim()}` : ""}
                  </p>
                  <p className="text-sm">
                    {t("Urgency")}: {t(preview.priority)}
                  </p>
                  {file && (
                    <p className="text-sm break-anywhere">Photo: {file.name}</p>
                  )}
                  <ErrorMessage message={error} />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      loading={publishing}
                      onClick={() => submit(preview)}
                    >
                      Publish notice
                    </Button>
                    <Button
                      variant="outline"
                      disabled={publishing}
                      onClick={() => setPreview(null)}
                    >
                      Edit notice
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>
    </div>
  );
}
