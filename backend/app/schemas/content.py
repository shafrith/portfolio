from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field
from pydantic.alias_generators import to_camel


def _clean_link(value: object) -> str | None:
    """Treat empty strings and 'TODO...' placeholders as missing links."""
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.upper().startswith("TODO"):
        return None
    return text


OptionalLink = Annotated[str | None, BeforeValidator(_clean_link)]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Links(CamelModel):
    email: OptionalLink = None
    linkedin: OptionalLink = None
    github: OptionalLink = None
    resume: OptionalLink = None


class Stat(CamelModel):
    value: int
    suffix: str = ""
    label: str


class Education(CamelModel):
    degree: str
    institution: str
    start: str
    end: str


class Profile(CamelModel):
    name: str
    short_name: str
    title: str
    short_title: str = Field(default="", description="Compact role line, e.g. in the footer")
    eyebrow: str
    tagline: str
    summary: str
    location: str
    photo: str
    links: Links
    stats: list[Stat]
    education: list[Education] = Field(default_factory=list)


class ExperienceProject(CamelModel):
    name: str
    role: str
    start: str = Field(description="YYYY-MM")
    end: str | None = Field(default=None, description="YYYY-MM, null = present")
    summary: str = Field(default="", description="1-3 sentences shown on the site")
    highlights: list[str] = Field(default_factory=list, description="Details for the AI assistant")


class Role(CamelModel):
    title: str
    start: str = Field(description="YYYY-MM")
    end: str | None = Field(default=None, description="YYYY-MM, null = present")
    summary: str = Field(default="", description="1-3 sentences shown on the site")
    highlights: list[str] = Field(default_factory=list, description="Details for the AI assistant")
    projects: list[ExperienceProject] = Field(default_factory=list)


class Company(CamelModel):
    company: str
    roles: list[Role]

    @property
    def latest_start(self) -> str:
        return max(r.start for r in self.roles)


class Project(CamelModel):
    id: str
    title: str
    description: str
    tech: list[str]
    github: OptionalLink = None
    demo: OptionalLink = None


class SkillGroup(CamelModel):
    category: str
    items: list[str]


class PortfolioContent(CamelModel):
    profile: Profile
    experience: list[Company]
    projects: list[Project]
    skills: list[SkillGroup]
