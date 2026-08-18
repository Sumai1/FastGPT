import { MongoUser } from '@fastgpt/service/support/user/schema';
import { hashStr } from '@fastgpt/global/common/string/tools';
import { createDefaultTeam } from '@fastgpt/service/support/user/team/controller';
import { exit } from 'process';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { getLogger, LogCategories } from '@fastgpt/service/common/logger';
import { appEnv } from '@/env';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support/user/team/constant';
import {
  CustomerServiceMemberRoleEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { MongoCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/schema';
import type { ClientSession } from '@fastgpt/service/common/mongo';

const logger = getLogger(LogCategories.SYSTEM);

export async function initCustomerServiceAccounts(
  session: ClientSession,
  rootTeamId: string,
  rootTmbId: string
) {
  const accounts = [
    {
      username: 'editor',
      name: '知识采编员',
      password: '1234',
      role: CustomerServiceMemberRoleEnum.knowledgeEditor,
      reason: '系统预置知识采编独立账号'
    },
    {
      username: 'reviewer',
      name: '知识审核员',
      password: '1234',
      role: CustomerServiceMemberRoleEnum.knowledgeReviewer,
      reason: '系统预置知识审核独立账号'
    }
  ];

  for (const acc of accounts) {
    let user = await MongoUser.findOne({ username: acc.username }).session(session);
    if (!user) {
      const [newUser] = await MongoUser.create(
        [
          {
            username: acc.username,
            password: hashStr(acc.password)
          }
        ],
        { session }
      );
      user = newUser;
    } else {
      await user.updateOne({ password: hashStr(acc.password) }, { session });
    }

    let tmb = await MongoTeamMember.findOne({
      teamId: rootTeamId,
      userId: user._id
    }).session(session);
    if (!tmb) {
      const [newTmb] = await MongoTeamMember.create(
        [
          {
            teamId: rootTeamId,
            userId: user._id,
            name: acc.name,
            status: TeamMemberStatusEnum.active,
            createTime: new Date()
          }
        ],
        { session }
      );
      tmb = newTmb;
    }

    if (!user.lastLoginTmbId) {
      await user.updateOne({ lastLoginTmbId: tmb._id }, { session });
    }

    await MongoCustomerServiceMemberRole.findOneAndUpdate(
      { teamId: rootTeamId, tmbId: tmb._id },
      {
        teamId: rootTeamId,
        tmbId: tmb._id,
        role: acc.role,
        status: CustomerServiceResourceStatusEnum.active,
        reason: acc.reason,
        creatorTmbId: rootTmbId,
        updateTmbId: rootTmbId,
        updateTime: new Date()
      },
      { upsert: true, session }
    );
  }
}

export async function initRootUser(retry = 3): Promise<any> {
  try {
    const rootUser = await MongoUser.findOne({
      username: 'root'
    });
    const psw = appEnv.DEFAULT_ROOT_PSW;

    let rootId = rootUser?._id || '';

    await mongoSessionRun(async (session) => {
      // init root user
      if (rootUser) {
        await rootUser.updateOne({
          password: hashStr(psw)
        });
      } else {
        const [{ _id }] = await MongoUser.create(
          [
            {
              username: 'root',
              password: hashStr(psw)
            }
          ],
          { session, ordered: true }
        );
        rootId = _id;
      }
      // init root team
      await createDefaultTeam({ userId: rootId, session });

      const rootTmb = await MongoTeamMember.findOne({ userId: rootId }).session(session);
      if (rootTmb) {
        if (!rootUser?.lastLoginTmbId) {
          await MongoUser.updateOne({ _id: rootId }, { lastLoginTmbId: rootTmb._id }, { session });
        }
        await initCustomerServiceAccounts(
          session,
          rootTmb.teamId.toString(),
          rootTmb._id.toString()
        );
      }
    });

    logger.info('Root user & Customer Service accounts initialized', {
      username: 'root',
      fromEnvPassword: appEnv.DEFAULT_ROOT_PSW !== '123456'
    });
  } catch (error) {
    if (retry > 0) {
      logger.warn('Retrying root user initialization', { retryLeft: retry - 1 });
      return initRootUser(retry - 1);
    } else {
      logger.error('Root user initialization failed', { error });
      exit(1);
    }
  }
}
