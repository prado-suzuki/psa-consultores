import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { HeroBanner } from "@/components/dashboard/momentum";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DevHubDefinition } from "@/types/devHub";

interface DevHubPageProps {
  hub: DevHubDefinition;
}

const DevHubPage = ({ hub }: DevHubPageProps) => {
  const navigate = useNavigate();
  const HeroIcon = hub.heroIcon;

  return (
    <DevLayout
      title={hub.title}
      subtitle={hub.subtitle}
      headerActions={
        <Button variant="outline" onClick={() => navigate(hub.backPath ?? "/equipe/dev")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {hub.backLabel ?? "Voltar ao painel"}
        </Button>
      }
    >
      <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center gap-8">
        <HeroBanner
          eyebrow={hub.heroEyebrow}
          title={hub.heroTitle}
          description={hub.heroDescription}
          icon={<HeroIcon className="h-6 w-6 text-white" />}
        />

        <div className={`mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 ${hub.options.length > 2 ? "xl:grid-cols-2" : "lg:grid-cols-2"}`}>
          {hub.options.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.path}
                type="button"
                onClick={() => navigate(option.path)}
                className="group flex min-h-[320px] flex-col rounded-3xl border border-border bg-white p-8 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary transition-colors group-hover:bg-primary/15">
                    <Icon className="h-7 w-7" />
                  </div>
                  <Badge variant="secondary" className="bg-muted text-foreground">
                    {option.badge}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">{option.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{option.description}</p>
                </div>

                <div className="mt-6 space-y-2">
                  {option.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-xl bg-muted px-4 py-3 text-sm font-medium text-foreground">
                      {highlight}
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-6">
                  {option.sopUrl ? (
                    <a
                      href={option.sopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary"
                    >
                      <BookOpen className="h-4 w-4" />
                      Manual
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span />
                  )}
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform group-hover:translate-x-1">
                    Abrir
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </DevLayout>
  );
};

export default DevHubPage;
