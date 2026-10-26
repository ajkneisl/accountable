package com.accountable.features

import features.competition.CompetitionGoals
import features.competition.CompetitionMembers
import features.competition.Competitions
import features.competition.createCompetition
import features.competition.findCompetitionByID
import features.competition.findCompetitionByJoinCode
import features.competition.isMember
import features.competition.joinCompetition
import features.competition.leaveCompetition
import features.competition.renameCompetition
import features.competition.resetJoinCode
import features.competition.transferCompetition
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.Users
import user.createUser

class CompetitionTest {
    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:competition-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
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
    fun `rename and transfer change only that competition`() = runBlocking {
        val owner = newUser()
        val member = newUser()
        val competition = createCompetition(owner, "Before").id
        val other = createCompetition(owner, "Other").id
        joinCompetition(member, competition)

        renameCompetition(competition, "After")
        transferCompetition(competition, member)

        val updated = findCompetitionByID(competition)!!
        assertEquals("After", updated.name)
        assertEquals(member, updated.ownerID)
        assertTrue(isMember(owner, competition))
        assertEquals("Other", findCompetitionByID(other)!!.name)
        assertEquals(owner, findCompetitionByID(other)!!.ownerID)
    }

    @Test
    fun `resetting the join code retires the old one`() = runBlocking {
        val competition = createCompetition(newUser(), "Test")
        val code = resetJoinCode(competition.id)

        assertNotEquals(competition.joinCode, code)
        assertNull(findCompetitionByJoinCode(competition.joinCode))
        assertEquals(competition.id, findCompetitionByJoinCode(code)?.id)
    }

    @Test
    fun `a removed member is no longer one`() = runBlocking {
        val competition = createCompetition(newUser(), "Test").id
        val member = newUser()
        joinCompetition(member, competition)

        assertTrue(leaveCompetition(member, competition))
        assertFalse(isMember(member, competition))
        assertFalse(leaveCompetition(member, competition))
    }
}
