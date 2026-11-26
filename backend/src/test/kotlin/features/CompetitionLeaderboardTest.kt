package com.accountable.features

import features.competition.CompetitionGoals
import features.competition.CompetitionMembers
import features.competition.Competitions
import features.competition.createCompetition
import features.competition.findCompetitionByID
import features.competition.joinCompetition
import features.competition.leaderboardFor
import features.competition.upsertCompetitionGoal
import features.goals.GoalPeriod
import integrations.AppleStepsTable
import integrations.GitHubTable
import integrations.api.UserIntegrations
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import user.Users
import user.createUser

class CompetitionLeaderboardTest {
    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:competition-leaderboard-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(
                Users,
                Competitions,
                CompetitionMembers,
                CompetitionGoals,
                UserIntegrations,
                GitHubTable,
                AppleStepsTable,
            )
            AppleStepsTable.deleteAll()
            GitHubTable.deleteAll()
            UserIntegrations.deleteAll()
            CompetitionGoals.deleteAll()
            CompetitionMembers.deleteAll()
            Competitions.deleteAll()
            Users.deleteAll()
        }
    }

    private fun newUser(): UUID =
        createUser("u${UUID.randomUUID().toString().take(8)}", "${UUID.randomUUID()}@e.com", "hash", "UTC").id

    private fun ms(date: String): Long =
        LocalDate.parse(date).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

    private fun commits(user: UUID, date: String, count: Long) = transaction {
        GitHubTable.insert {
            it[userID] = user
            it[GitHubTable.date] = ms(date)
            it[commits] = count
        }
    }

    private fun steps(user: UUID, date: String, count: Long) = transaction {
        AppleStepsTable.insert {
            it[userID] = user
            it[AppleStepsTable.date] = ms(date)
            it[steps] = count
        }
    }

    /** Move the competition's creation, and its owner's joining, back to [date]. */
    private fun createdOn(competition: UUID, owner: UUID, date: String) = transaction {
        Competitions.update({ Competitions.id eq competition }) { it[createdAt] = ms(date) }
        joinedOn(competition, owner, date)
    }

    private fun joinedOn(competition: UUID, user: UUID, date: String) = transaction {
        CompetitionMembers.update({
            (CompetitionMembers.competitionID eq competition) and (CompetitionMembers.userID eq user)
        }) {
            it[joinedAt] = ms(date)
        }
    }

    @Test
    fun `counts the completed weeks each member finished first`(): Unit = runBlocking {
        // Wednesday; the completed weeks start on Feb 16, Feb 23, Mar 2 and Mar 9.
        val now = ms("2026-03-18") + 12 * 60 * 60 * 1000
        val owner = newUser()
        val joiner = newUser()
        val id = createCompetition(owner, "Test").id
        joinCompetition(joiner, id)
        createdOn(id, owner, "2026-02-17")
        joinedOn(id, joiner, "2026-03-03")
        upsertCompetitionGoal(id, "github", "commits", GoalPeriod.WEEKLY, 5)
        upsertCompetitionGoal(id, "apple_steps", "steps", GoalPeriod.DAILY, 1_000)

        // Feb 16: nobody meets a goal, so the week has no winner.
        commits(owner, "2026-02-18", 4)
        // Feb 23: the owner alone — the joiner did more, but hadn't joined yet.
        commits(owner, "2026-02-24", 5)
        commits(joiner, "2026-02-24", 9)
        // Mar 2: both meet the commits goal, but the owner also met the steps goal every day.
        commits(owner, "2026-03-03", 5)
        commits(joiner, "2026-03-04", 6)
        (2..8).forEach { steps(owner, "2026-03-0$it", 1_000) }
        // Mar 9: level on one goal each, so both take the week.
        commits(owner, "2026-03-10", 5)
        commits(joiner, "2026-03-11", 5)
        // This week is still running and isn't counted.
        commits(joiner, "2026-03-16", 50)

        val board = leaderboardFor(findCompetitionByID(id)!!, now)

        assertEquals(4, board.weeks)
        assertEquals(listOf(owner to 3, joiner to 1), board.entries.map { it.userID to it.weeksWon })
    }

    @Test
    fun `is empty before a week has finished or without goals`(): Unit = runBlocking {
        val now = ms("2026-03-18")
        val owner = newUser()

        // Created this week: nothing has finished yet.
        val fresh = createCompetition(owner, "Fresh").id
        createdOn(fresh, owner, "2026-03-17")
        upsertCompetitionGoal(fresh, "github", "commits", GoalPeriod.WEEKLY, 5)
        commits(owner, "2026-03-17", 9)
        val freshBoard = leaderboardFor(findCompetitionByID(fresh)!!, now)
        assertEquals(0, freshBoard.weeks)
        assertEquals(listOf(owner to 0), freshBoard.entries.map { it.userID to it.weeksWon })

        // No shared goals: nothing to finish first at.
        val bare = createCompetition(owner, "Bare").id
        createdOn(bare, owner, "2026-02-17")
        val bareBoard = leaderboardFor(findCompetitionByID(bare)!!, now)
        assertEquals(listOf(owner to 0), bareBoard.entries.map { it.userID to it.weeksWon })
    }

    @Test
    fun `a daily goal has to be met on every day of the week`(): Unit = runBlocking {
        // Wednesday; the only completed week starts on Mar 9.
        val now = ms("2026-03-18") + 12 * 60 * 60 * 1000
        val owner = newUser()
        val joiner = newUser()
        val id = createCompetition(owner, "Test").id
        joinCompetition(joiner, id)
        createdOn(id, owner, "2026-03-09")
        joinedOn(id, joiner, "2026-03-09")
        upsertCompetitionGoal(id, "apple_steps", "steps", GoalPeriod.DAILY, 1_000)

        // The owner walks far more in all, but one big day can't cover the six they missed.
        steps(owner, "2026-03-10", 50_000)
        (9..15).forEach { steps(joiner, "2026-03-${"%02d".format(it)}", 1_000) }

        val board = leaderboardFor(findCompetitionByID(id)!!, now)

        assertEquals(listOf(joiner to 1, owner to 0), board.entries.map { it.userID to it.weeksWon })
    }

    @Test
    fun `days before a member joined don't count against a daily goal`(): Unit = runBlocking {
        val now = ms("2026-03-18") + 12 * 60 * 60 * 1000
        val owner = newUser()
        val joiner = newUser()
        val id = createCompetition(owner, "Test").id
        joinCompetition(joiner, id)
        createdOn(id, owner, "2026-03-09")
        // Thursday: only Thursday to Sunday count for the joiner.
        joinedOn(id, joiner, "2026-03-12")
        upsertCompetitionGoal(id, "apple_steps", "steps", GoalPeriod.DAILY, 1_000)

        (12..15).forEach { steps(joiner, "2026-03-$it", 1_000) }

        val board = leaderboardFor(findCompetitionByID(id)!!, now)

        assertEquals(listOf(joiner to 1, owner to 0), board.entries.map { it.userID to it.weeksWon })
    }
}
