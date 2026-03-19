
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  detectRuntime,
} = require('./runtime/index-browser')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.3.1
 * Query Engine version: 61e140623197a131c2a6189271ffee05a7aa9a59
 */
Prisma.prismaVersion = {
  client: "5.3.1",
  engine: "61e140623197a131c2a6189271ffee05a7aa9a59"
}

Prisma.PrismaClientKnownRequestError = () => {
  throw new Error(`PrismaClientKnownRequestError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  throw new Error(`PrismaClientUnknownRequestError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientRustPanicError = () => {
  throw new Error(`PrismaClientRustPanicError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientInitializationError = () => {
  throw new Error(`PrismaClientInitializationError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientValidationError = () => {
  throw new Error(`PrismaClientValidationError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.NotFoundError = () => {
  throw new Error(`NotFoundError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  throw new Error(`sqltag is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.empty = () => {
  throw new Error(`empty is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.join = () => {
  throw new Error(`join is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.raw = () => {
  throw new Error(`raw is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  throw new Error(`Extensions.getExtensionContext is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.defineExtension = () => {
  throw new Error(`Extensions.defineExtension is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.ProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  email: 'email',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CourseScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  imageUrl: 'imageUrl',
  isPublished: 'isPublished',
  categoryId: 'categoryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.AttachmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  url: 'url',
  courseId: 'courseId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChapterScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  videoSourceType: 'videoSourceType',
  videoUrl: 'videoUrl',
  externalUrl: 'externalUrl',
  embedUrl: 'embedUrl',
  videoProvider: 'videoProvider',
  position: 'position',
  isPublished: 'isPublished',
  isFree: 'isFree',
  courseId: 'courseId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MuxDataScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  playbackId: 'playbackId',
  chapterId: 'chapterId'
};

exports.Prisma.UserProgressScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  chapterId: 'chapterId',
  isCompleted: 'isCompleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuizScalarFieldEnum = {
  id: 'id',
  chapterId: 'chapterId',
  isPublished: 'isPublished',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuestionScalarFieldEnum = {
  id: 'id',
  quizId: 'quizId',
  prompt: 'prompt',
  position: 'position',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OptionScalarFieldEnum = {
  id: 'id',
  questionId: 'questionId',
  text: 'text',
  isCorrect: 'isCorrect',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnswerScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  questionId: 'questionId',
  optionId: 'optionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  emailVerified: 'emailVerified',
  image: 'image'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.ProfileOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  email: 'email'
};

exports.Prisma.CourseOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  imageUrl: 'imageUrl',
  categoryId: 'categoryId'
};

exports.Prisma.CategoryOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.AttachmentOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name',
  url: 'url',
  courseId: 'courseId'
};

exports.Prisma.ChapterOrderByRelevanceFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  videoUrl: 'videoUrl',
  externalUrl: 'externalUrl',
  embedUrl: 'embedUrl',
  courseId: 'courseId'
};

exports.Prisma.MuxDataOrderByRelevanceFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  playbackId: 'playbackId',
  chapterId: 'chapterId'
};

exports.Prisma.UserProgressOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  chapterId: 'chapterId'
};

exports.Prisma.QuizOrderByRelevanceFieldEnum = {
  id: 'id',
  chapterId: 'chapterId'
};

exports.Prisma.QuestionOrderByRelevanceFieldEnum = {
  id: 'id',
  quizId: 'quizId',
  prompt: 'prompt'
};

exports.Prisma.OptionOrderByRelevanceFieldEnum = {
  id: 'id',
  questionId: 'questionId',
  text: 'text'
};

exports.Prisma.AnswerOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  questionId: 'questionId',
  optionId: 'optionId'
};

exports.Prisma.AccountOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionOrderByRelevanceFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId'
};

exports.Prisma.UserOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  image: 'image'
};

exports.Prisma.VerificationTokenOrderByRelevanceFieldEnum = {
  identifier: 'identifier',
  token: 'token'
};
exports.Role = exports.$Enums.Role = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT'
};

exports.VideoSourceType = exports.$Enums.VideoSourceType = {
  UPLOAD: 'UPLOAD',
  EXTERNAL: 'EXTERNAL'
};

exports.VideoProvider = exports.$Enums.VideoProvider = {
  YOUTUBE: 'YOUTUBE',
  VIMEO: 'VIMEO',
  OTHER: 'OTHER'
};

exports.Prisma.ModelName = {
  Profile: 'Profile',
  Course: 'Course',
  Category: 'Category',
  Attachment: 'Attachment',
  Chapter: 'Chapter',
  MuxData: 'MuxData',
  UserProgress: 'UserProgress',
  Quiz: 'Quiz',
  Question: 'Question',
  Option: 'Option',
  Answer: 'Answer',
  Account: 'Account',
  Session: 'Session',
  User: 'User',
  VerificationToken: 'VerificationToken'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        const runtime = detectRuntime()
        const edgeRuntimeName = {
          'workerd': 'Cloudflare Workers',
          'deno': 'Deno and Deno Deploy',
          'netlify': 'Netlify Edge Functions',
          'edge-light': 'Vercel Edge Functions',
        }[runtime]

        let message = 'PrismaClient is unable to run in '
        if (edgeRuntimeName !== undefined) {
          message += edgeRuntimeName + '. As an alternative, try Accelerate: https://pris.ly/d/accelerate.'
        } else {
          message += 'this browser environment, or has been bundled for the browser (running in `' + runtime + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://github.com/prisma/prisma/issues`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
