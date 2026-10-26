package com.accountable.features

import features.competition.CompetitionGoals
import features.competition.CompetitionMembers
import features.competition.Competitions
import features.competition.createCompetition
import features.competition.goalsForCompetition
import features.competition.upsertCompetitionGoal
import features.goals.GoalPeriod
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.Users
import user.createUser

class CompetitionGoalTest {
    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:competition-goal-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, Competitions, CompetitionMembers, CompetitionGoals)
            CompetitionGoals.deleteAll()
            CompetitionMembers.deleteAll()
            Competitions.deleteAll()
            Users.deleteAll()
        }
    }

    private fun newUser(): UUID =
        createUser("u${UUID.randomUUID().toString().take(8)}", "${UUID.randomUUID()}@e.com", "hash", "UTC").id

    @Test
    fun `editing a goal changes its target but keeps its place`() = runBlocking {
        val competition = createCompetition(newUser(), "Test").id
        val first = upsertCompetitionGoal(competition, "github", "commits", GoalPeriod.WEEKLY, 5)
        Thread.sleep(5)
        upsertCompetitionGoal(competition, "apple_steps", "steps", GoalPeriod.DAILY, 10_000)
        Thread.sleep(5)

        val edited = upsertCompetitionGoal(competition, "github", "commits", GoalPeriod.WEEKLY, 8)
        assertEquals(8L, edited.target)
        assertEquals(first.createdAt, edited.createdAt)
        assertEquals(
            listOf("apple_steps" to 10_000L, "github" to 8L),
            goalsForCompetition(competition).map { it.integration to it.target },
        )
    }
}
