from fastapi import APIRouter

from app.core.deps import ContentDep
from app.schemas.content import Company, Profile, Project, SkillGroup
from app.services.content import experience_newest_first

router = APIRouter(tags=["content"])


@router.get("/profile", response_model=Profile)
def get_profile(content: ContentDep) -> Profile:
    return content.profile


@router.get("/experience", response_model=list[Company])
def get_experience(content: ContentDep) -> list[Company]:
    return experience_newest_first(content)


@router.get("/projects", response_model=list[Project])
def get_projects(content: ContentDep) -> list[Project]:
    return content.projects


@router.get("/skills", response_model=list[SkillGroup])
def get_skills(content: ContentDep) -> list[SkillGroup]:
    return content.skills
